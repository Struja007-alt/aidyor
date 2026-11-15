// Flow: no payment -> 402 | verify -> run scan -> settle (only if scan ok) -> 200 + PAYMENT-RESPONSE
// Deploy with "Verify JWT" OFF (agents have no Supabase JWT).
// Supports Coinbase CDP facilitator (mainnet) via Ed25519 API key, or keyless testnet facilitator.

const env = (k: string, d = "") => Deno.env.get(k) ?? d;

const FACILITATOR = env("X402_FACILITATOR_URL", "https://x402.org/facilitator"); // testnet only
const PAY_TO = env("X402_PAY_TO");
const NETWORK = env("X402_NETWORK", "eip155:84532"); // TESTNET default. Mainnet Base: eip155:8453
const ASSET = env("X402_ASSET", "0x036CbD53842c5426634e7929541eC2318f3dCF7e"); // Base Sepolia USDC
const PRICE_ATOMIC = env("X402_PRICE_ATOMIC", "10000"); // 6 decimals: 10000 = $0.01
const EIP712_NAME = env("X402_EIP712_NAME", "USDC"); // mainnet is usually "USD Coin" - VERIFY
const EIP712_VERSION = env("X402_EIP712_VERSION", "2");
const SCAN_FUNCTION = env("X402_SCAN_FUNCTION", "scan-token"); // ASSUMPTION: your scan function name
const SUPABASE_URL = env("SUPABASE_URL");
const SERVICE_KEY = env("SUPABASE_SERVICE_ROLE_KEY");

// Coinbase CDP credentials (only needed for the CDP facilitator)
const CDP_KEY_ID = env("CDP_API_KEY_ID");
const CDP_KEY_SECRET = env("CDP_API_KEY_SECRET"); // Ed25519 secret (base64), NOT an ECDSA PEM

const CHAINS = new Set([
  "ethereum", "bsc", "solana", "polygon", "arbitrum",
  "base", "avalanche", "fantom", "optimism",
]);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, payment-signature",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Expose-Headers": "PAYMENT-REQUIRED, PAYMENT-RESPONSE",
};

const b64 = (o: unknown) => btoa(JSON.stringify(o));

function b64url(input: Uint8Array | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let s = "";
  bytes.forEach((x) => (s += String.fromCharCode(x)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ---- Coinbase CDP JWT (EdDSA) ----
let cdpKey: CryptoKey | null = null;

async function getCdpKey(): Promise<CryptoKey> {
  if (cdpKey) return cdpKey;
  if (CDP_KEY_SECRET.includes("BEGIN")) {
    throw new Error("cdp_key_is_pem_use_ed25519_key");
  }
  const raw = Uint8Array.from(atob(CDP_KEY_SECRET), (c) => c.charCodeAt(0));
  const seed = raw.slice(0, 32); // first 32 bytes = private seed
  // PKCS8 wrapper for an Ed25519 private key (16-byte prefix + 32-byte seed)
  const prefix = new Uint8Array([
    0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06,
    0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20,
  ]);
  const pkcs8 = new Uint8Array(48);
  pkcs8.set(prefix, 0);
  pkcs8.set(seed, 16);
  cdpKey = await crypto.subtle.importKey("pkcs8", pkcs8, { name: "Ed25519" }, false, ["sign"]);
  return cdpKey;
}

async function cdpJwt(method: string, url: URL): Promise<string> {
  const key = await getCdpKey();
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((x) => x.toString(16).padStart(2, "0")).join("");
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "EdDSA", typ: "JWT", kid: CDP_KEY_ID, nonce };
  const claims = {
    sub: CDP_KEY_ID,
    iss: "cdp",
    aud: ["cdp_service"],
    nbf: now,
    exp: now + 120,
    uri: `${method} ${url.hostname}${url.pathname}`,
  };
  const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: "Ed25519" }, key, new TextEncoder().encode(input)),
  );
  return `${input}.${b64url(sig)}`;
}
// ---------------------------------

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS, ...extra },
  });
}

function paymentRequired(url: string, error?: string) {
  const body = {
    x402Version: 2,
    ...(error ? { error } : {}),
    resource: {
      url,
      description: "AIDYOR token security scan (honeypot / rug-pull / scam risk)",
      mimeType: "application/json",
    },
    accepts: [{
      scheme: "exact",
      network: NETWORK,
      amount: PRICE_ATOMIC,
      asset: ASSET,
      payTo: PAY_TO,
      maxTimeoutSeconds: 60,
      extra: { name: EIP712_NAME, version: EIP712_VERSION },
    }],
  };
  return json(body, 402, { "PAYMENT-REQUIRED": b64(body) });
}

async function facilitator(path: "verify" | "settle", payload: unknown, requirements: unknown) {
  const url = new URL(`${FACILITATOR}/${path}`);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (CDP_KEY_ID && CDP_KEY_SECRET && url.hostname === "api.cdp.coinbase.com") {
    headers.Authorization = `Bearer ${await cdpJwt("POST", url)}`;
  }
  const r = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      x402Version: 2,
      paymentPayload: payload,
      paymentRequirements: requirements,
    }),
  });
  if (!r.ok) {
    console.error(`facilitator ${path} ${r.status}: ${(await r.text()).slice(0, 300)}`);
    throw new Error(`facilitator_${path}_${r.status}`);
  }
  return await r.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (!PAY_TO) return json({ error: "server_not_configured" }, 500);

  // Safety: never run mainnet against the testnet-only facilitator
  if (NETWORK === "eip155:8453" && FACILITATOR.includes("x402.org")) {
    return json({ error: "server_misconfigured_network_facilitator" }, 500);
  }
  if (FACILITATOR.includes("api.cdp.coinbase.com") && (!CDP_KEY_ID || !CDP_KEY_SECRET)) {
    return json({ error: "server_misconfigured_cdp_keys" }, 500);
  }

  // 1) Validate input BEFORE asking for money
  const u = new URL(req.url);
  let address = u.searchParams.get("address") ?? "";
  let chain = (u.searchParams.get("chain") ?? "").toLowerCase();
  if (req.method === "POST") {
    try {
      const b = await req.json();
      address = b.address ?? address;
      chain = String(b.chain ?? chain).toLowerCase();
    } catch { /* fall through to validation */ }
  }
  if (!address || address.length > 100 || !CHAINS.has(chain)) {
    return json({ error: "invalid_input", supported_chains: [...CHAINS] }, 400);
  }

  // 2) No payment -> 402 with price
  const header = req.headers.get("payment-signature");
  const offer = paymentRequired(req.url);
  if (!header) return offer;

  let payload: unknown;
  try {
    payload = JSON.parse(atob(header));
  } catch {
    return paymentRequired(req.url, "invalid_payment_header");
  }
  const requirements = (await offer.clone().json()).accepts[0];

  // 3) Verify (read-only, nothing charged yet)
  try {
    const v = await facilitator("verify", payload, requirements);
    if (!v.isValid) return paymentRequired(req.url, v.invalidReason ?? "invalid_payment");
  } catch (e) {
    return json({ error: "facilitator_unavailable", detail: String(e) }, 502);
  }

  // 4) Run the real scan. If it fails we do NOT settle -> buyer is not charged.
  let scan: Response;
  try {
    scan = await fetch(`${SUPABASE_URL}/functions/v1/${SCAN_FUNCTION}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ address, chain }), // ASSUMPTION: adjust to your scan function's input
    });
  } catch {
    return json({ error: "scan_unavailable" }, 502);
  }
  if (!scan.ok) return json({ error: "scan_failed", status: scan.status }, 502);
  const result = await scan.json();

  // 5) Settle on-chain, then return result + receipt
  try {
    const s = await facilitator("settle", payload, requirements);
    if (!s.success) return paymentRequired(req.url, s.errorReason ?? "settlement_failed");
    return json(result, 200, { "PAYMENT-RESPONSE": b64(s) });
  } catch (e) {
    return json({ error: "settlement_unavailable", detail: String(e) }, 502);
  }
});
