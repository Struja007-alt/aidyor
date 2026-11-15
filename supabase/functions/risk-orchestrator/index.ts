import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

// =====================================================================
// risk-orchestrator
// Based on the DEPLOYED v24 (anonymous-visitor handling, strict scoring,
// hard caps). NEW in this version: Known Asset Registry (stablecoins,
// majors, wrapped assets), symbol input (BTC/ETH/SOL/USDT/USDC...),
// stablecoin depeg check, and impersonation detection.
// =====================================================================

const ALLOWED_ORIGINS = [
  "https://aidyor.app",
  "https://www.aidyor.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = isAllowedOrigin(origin) ? origin! : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
}

// Tron addresses (T..., 34 base58 chars) also match the solana pattern,
// so they pass validation here. Case must be preserved for both.
const ADDRESS_PATTERNS = {
  evm: /^0x[a-fA-F0-9]{40}$/,
  solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
};

function validateAddress(address: unknown): boolean {
  if (!address || typeof address !== "string" || address.length > 100) {
    return false;
  }
  const a = address.trim();
  return ADDRESS_PATTERNS.evm.test(a) || ADDRESS_PATTERNS.solana.test(a);
}

// =====================================================================
// KNOWN ASSET REGISTRY
// Rule: match by CHAIN + CONTRACT ADDRESS only, never by symbol or name.
// Chain ids are DexScreener chainIds.
// Anything not listed here is scanned normally. A token that uses a
// protected symbol (USDT, USDC...) but is NOT listed gets flagged.
//
// VERIFY BEFORE RELYING: Polygon/Base/Arbitrum USDC entries were checked
// against Circle docs. All other addresses are from memory - compare each
// with Etherscan / BscScan / Solscan / Tronscan.
// =====================================================================

type AssetKind = "stablecoin" | "major" | "wrapped";

interface KnownAsset {
  symbol: string;
  name: string;
  chain: string;
  address: string; // lowercase for EVM, exact case for Solana/Tron
  kind: AssetKind;
  bridged: boolean; // bridge-minted or alternate version of the asset
  centralized: boolean; // issuer can freeze / mint (USDT, USDC)
}

function asset(
  symbol: string,
  name: string,
  chain: string,
  address: string,
  kind: AssetKind,
  opts: { bridged?: boolean; centralized?: boolean } = {}
): KnownAsset {
  return {
    symbol,
    name,
    chain,
    address: ADDRESS_PATTERNS.evm.test(address) ? address.toLowerCase() : address,
    kind,
    bridged: opts.bridged === true,
    centralized:
      opts.centralized !== undefined ? opts.centralized : kind === "stablecoin",
  };
}

// Order matters: Ethereum entries come first so a symbol with no network
// resolves to Ethereum by default.
const KNOWN_ASSETS: KnownAsset[] = [
  // ---- Ethereum
  asset("USDT", "Tether USD", "ethereum", "0xdAC17F958D2ee523a2206206994597C13D831ec7", "stablecoin"),
  asset("USDC", "USD Coin", "ethereum", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "stablecoin"),
  asset("DAI", "Dai Stablecoin", "ethereum", "0x6B175474E89094C44Da98b954EedeAC495271d0F", "stablecoin", { centralized: false }),
  asset("WETH", "Wrapped Ether", "ethereum", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", "wrapped"),
  asset("WBTC", "Wrapped Bitcoin", "ethereum", "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", "wrapped"),
  asset("BNB", "BNB (ERC-20)", "ethereum", "0xB8c77482e45F1F44dE1745F52C74426C631bDD52", "major", { bridged: true }),

  // ---- BNB Chain (DexScreener id: bsc)
  asset("USDT", "Tether USD", "bsc", "0x55d398326f99059fF775485246999027B3197955", "stablecoin"),
  asset("USDC", "USD Coin", "bsc", "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", "stablecoin"),
  asset("WBNB", "Wrapped BNB", "bsc", "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", "wrapped"),
  asset("ETH", "Ethereum (Binance-Peg)", "bsc", "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", "major", { bridged: true }),
  asset("BTCB", "Bitcoin BEP2 (BTCB)", "bsc", "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", "major", { bridged: true }),

  // ---- Polygon
  asset("USDC", "USD Coin", "polygon", "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", "stablecoin"),
  asset("USDC", "USD Coin (USDC.e, bridged)", "polygon", "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", "stablecoin", { bridged: true }),
  asset("USDT", "Tether USD", "polygon", "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", "stablecoin"),
  asset("DAI", "Dai Stablecoin", "polygon", "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", "stablecoin", { bridged: true, centralized: false }),
  asset("WETH", "Wrapped Ether", "polygon", "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", "wrapped", { bridged: true }),
  asset("WBTC", "Wrapped Bitcoin", "polygon", "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6", "wrapped", { bridged: true }),
  asset("WMATIC", "Wrapped Matic", "polygon", "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", "wrapped"),

  // ---- Arbitrum
  asset("USDC", "USD Coin", "arbitrum", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "stablecoin"),
  asset("USDC", "USD Coin (USDC.e, bridged)", "arbitrum", "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", "stablecoin", { bridged: true }),
  asset("USDT", "Tether USD", "arbitrum", "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "stablecoin"),
  asset("DAI", "Dai Stablecoin", "arbitrum", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", "stablecoin", { bridged: true, centralized: false }),
  asset("WETH", "Wrapped Ether", "arbitrum", "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", "wrapped"),
  asset("WBTC", "Wrapped Bitcoin", "arbitrum", "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", "wrapped", { bridged: true }),

  // ---- Base
  asset("USDC", "USD Coin", "base", "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "stablecoin"),
  asset("WETH", "Wrapped Ether", "base", "0x4200000000000000000000000000000000000006", "wrapped"),

  // ---- Optimism
  asset("USDC", "USD Coin", "optimism", "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", "stablecoin"),
  asset("USDC", "USD Coin (USDC.e, bridged)", "optimism", "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", "stablecoin", { bridged: true }),
  asset("USDT", "Tether USD", "optimism", "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", "stablecoin"),
  asset("DAI", "Dai Stablecoin", "optimism", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", "stablecoin", { bridged: true, centralized: false }),
  asset("WETH", "Wrapped Ether", "optimism", "0x4200000000000000000000000000000000000006", "wrapped"),
  asset("WBTC", "Wrapped Bitcoin", "optimism", "0x68f180fcCe6836688e9084f035309E29Bf0A2095", "wrapped", { bridged: true }),

  // ---- Avalanche
  asset("USDC", "USD Coin", "avalanche", "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", "stablecoin"),
  asset("USDC", "USD Coin (USDC.e, bridged)", "avalanche", "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664", "stablecoin", { bridged: true }),
  asset("USDT", "Tether USD", "avalanche", "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", "stablecoin"),
  asset("WAVAX", "Wrapped AVAX", "avalanche", "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", "wrapped"),

  // ---- Fantom
  asset("USDC", "USD Coin (bridged)", "fantom", "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75", "stablecoin", { bridged: true }),
  asset("WETH", "Wrapped Ether (bridged)", "fantom", "0x74b23882a30290451A17c44f4F05243b6b58C76d", "wrapped", { bridged: true }),
  asset("WFTM", "Wrapped Fantom", "fantom", "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83", "wrapped"),

  // ---- Solana (case-sensitive)
  asset("USDC", "USD Coin", "solana", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "stablecoin"),
  asset("USDT", "Tether USD", "solana", "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", "stablecoin"),
  asset("WSOL", "Wrapped SOL", "solana", "So11111111111111111111111111111111111111112", "wrapped"),
  asset("ETH", "Ether (Wormhole)", "solana", "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs", "major", { bridged: true }),
  asset("WBTC", "Wrapped Bitcoin (Portal)", "solana", "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh", "wrapped", { bridged: true }),

  // ---- Tron (case-sensitive). Needs 'tron' added to market-data-service NETWORK_ALIASES.
  asset("USDT", "Tether USD", "tron", "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", "stablecoin"),
  asset("USDC", "USD Coin", "tron", "TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8", "stablecoin"),
];

// Every accepted network name maps to the DexScreener chainId.
// Same as market-data-service, plus Tron.
const CHAIN_ALIASES = new Map<string, string>([
  ["eth", "ethereum"], ["ethereum", "ethereum"],
  ["bsc", "bsc"], ["bnb", "bsc"],
  ["polygon", "polygon"], ["matic", "polygon"],
  ["arbitrum", "arbitrum"], ["arb", "arbitrum"],
  ["base", "base"],
  ["optimism", "optimism"], ["op", "optimism"],
  ["avalanche", "avalanche"], ["avax", "avalanche"],
  ["fantom", "fantom"], ["ftm", "fantom"],
  ["solana", "solana"], ["sol", "solana"],
  ["tron", "tron"], ["trx", "tron"],
]);

function canonicalChain(network: unknown): string | null {
  if (!network || typeof network !== "string") return null;
  return CHAIN_ALIASES.get(network.toLowerCase().trim()) ?? null;
}

function findKnownAsset(
  chain: string | null,
  address: string
): KnownAsset | undefined {
  if (!chain) return undefined;
  const key = ADDRESS_PATTERNS.evm.test(address) ? address.toLowerCase() : address;
  return KNOWN_ASSETS.find((a) => a.chain === chain && a.address === key);
}

// Symbols scammers copy. A token using one of these on a contract that is
// NOT in the registry gets flagged as a possible impersonator.
const PROTECTED_SYMBOLS = new Set([
  "USDT", "USDC", "DAI", "WBTC", "WETH", "WBNB", "BTC", "ETH", "SOL", "BNB",
]);

// Symbol input -> the registry symbol it resolves to.
// Native coins (BTC, ETH, SOL...) have no contract, so they are scanned
// through their wrapped version and labelled as native.
const SYMBOL_ALIASES = new Map<string, { target: string; native: string | null }>([
  ["BTC", { target: "WBTC", native: "Bitcoin" }],
  ["ETH", { target: "WETH", native: "Ether" }],
  ["SOL", { target: "WSOL", native: "SOL" }],
  ["BNB", { target: "WBNB", native: "BNB" }],
  ["MATIC", { target: "WMATIC", native: "MATIC" }],
  ["AVAX", { target: "WAVAX", native: "AVAX" }],
  ["FTM", { target: "WFTM", native: "FTM" }],
  ["USDT", { target: "USDT", native: null }],
  ["USDC", { target: "USDC", native: null }],
  ["DAI", { target: "DAI", native: null }],
]);

type SymbolResolution =
  | { asset: KnownAsset; inputSymbol: string; native: string | null }
  | { error: string }
  | null;

// Maps a symbol typed in place of an address to a registry contract.
// This never trusts a symbol on a scanned token - it only picks which
// registry contract to scan.
function resolveSymbolInput(raw: unknown, network: unknown): SymbolResolution {
  if (typeof raw !== "string") return null;
  const key = raw.trim().toUpperCase();
  if (key.length === 0 || key.length > 10) return null;
  const alias = SYMBOL_ALIASES.get(key);
  if (!alias) return null;

  const wantedChain = canonicalChain(network);
  const pool = KNOWN_ASSETS.filter((a) => a.symbol === alias.target);
  const onChain = wantedChain ? pool.filter((a) => a.chain === wantedChain) : pool;
  const pick = onChain.find((a) => !a.bridged) ?? onChain[0];

  if (!pick) {
    return {
      error: `No known ${key} asset on ${wantedChain ?? "any supported chain"}`,
    };
  }
  return { asset: pick, inputSymbol: key, native: alias.native };
}

type Status = "safe" | "warning" | "danger";
interface RiskFactor {
  name: string;
  status: Status;
  description: string;
}

function levelFromScore(score: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (score >= 70) return "LOW";
  if (score >= 40) return "MEDIUM";
  if (score >= 20) return "HIGH";
  return "CRITICAL";
}

// Fixed assessment for a registry-verified asset. Skips honeypot /
// liquidity / simulation heuristics (they produce false alarms on
// USDT, USDC, WETH...) but still checks the live price against the peg.
function buildKnownAssetAssessment(a: KnownAsset, price: number) {
  const factors: RiskFactor[] = [];
  const capReasons: string[] = [];
  let score = a.kind === "stablecoin" ? 92 : 90;
  let priceChecked = false;

  factors.push({
    name: "Verified Asset",
    status: "safe",
    description: `Contract matches the official ${a.symbol} (${a.name}) on ${a.chain}.`,
  });

  if (a.bridged) {
    factors.push({
      name: "Bridged Version",
      status: "warning",
      description:
        "Bridge-minted or alternate version. Its value depends on the bridge or issuer, not only the original asset.",
    });
    score = Math.min(score, 85);
  }

  if (a.kind === "stablecoin") {
    if (a.centralized) {
      factors.push({
        name: "Issuer-Controlled",
        status: "warning",
        description:
          "The issuer can freeze addresses and mint or burn supply. The peg depends on issuer reserves.",
      });
    } else {
      factors.push({
        name: "Collateral-Backed",
        status: "safe",
        description:
          "Peg is maintained by on-chain collateral and governance rather than a single issuer.",
      });
    }

    if (price > 0) {
      priceChecked = true;
      const deviation = Math.abs(price - 1);
      if (deviation > 0.03) {
        factors.push({
          name: "Peg Broken",
          status: "danger",
          description: `Trading at $${price.toFixed(4)}, ${(deviation * 100).toFixed(1)}% away from $1.`,
        });
        score = Math.min(score, 30);
        capReasons.push("Stablecoin has lost its peg");
      } else if (deviation > 0.005) {
        factors.push({
          name: "Peg Deviation",
          status: "warning",
          description: `Trading at $${price.toFixed(4)}, ${(deviation * 100).toFixed(2)}% away from $1.`,
        });
        score = Math.min(score, 75);
        capReasons.push("Minor peg deviation");
      } else {
        factors.push({
          name: "Peg Holding",
          status: "safe",
          description: `Trading at $${price.toFixed(4)}.`,
        });
      }
    } else {
      factors.push({
        name: "Peg Unverified",
        status: "warning",
        description: "No USD price available to confirm the peg right now.",
      });
      score = Math.min(score, 75);
      capReasons.push("Peg could not be verified");
    }
  } else if (a.kind === "wrapped" && !a.bridged) {
    factors.push({
      name: "Wrapped Asset",
      status: "safe",
      description: "Wrapped token redeemable 1:1 for the underlying asset through its contract.",
    });
  }

  const riskAssessment = {
    overallScore: score,
    riskLevel: levelFromScore(score),
    confidence: priceChecked || a.kind !== "stablecoin" ? 0.95 : 0.85,
    trend: "STABLE",
    dataComplete: priceChecked || a.kind !== "stablecoin",
    capReasons,
  };

  return { factors, riskAssessment };
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";

async function callService(
  serviceName: string,
  body: unknown,
  authHeader: string
): Promise<any | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${serviceName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`[Orchestrator] ${serviceName} returned ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.success ? data : null;
  } catch (_error) {
    clearTimeout(timeout);
    console.error(`[Orchestrator] ${serviceName} error`);
    return null;
  }
}

// Returns a clamped 0-100 number, or null if missing/invalid.
// IMPORTANT: 0 is a valid score (worst) and must NOT be treated as missing.
function asScore(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, value));
}

// Flags can arrive as true, 1, "1", or "true".
function isTruthyFlag(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

// Used only when a score is missing. Pessimistic on purpose.
const MISSING_SCORE_FALLBACK = 40;

function calculateOverallRisk(
  marketScore: number | null,
  securityScore: number | null,
  simulationStatus: string,
  ctx: any
) {
  const marketKnown = marketScore !== null;
  const securityKnown = securityScore !== null && ctx.securityAvailable;

  const m = marketKnown ? marketScore! : MISSING_SCORE_FALLBACK;
  const s = securityKnown ? securityScore! : MISSING_SCORE_FALLBACK;

  // 45% security + 40% market (max 85), minus simulation penalty
  const baseScore = s * 0.45 + m * 0.4;

  let simulationPenalty = 0;
  let trend = "STABLE";

  if (simulationStatus === "dump") {
    simulationPenalty = 20;
    trend = "WORSENING";
  } else if (simulationStatus === "pump") {
    simulationPenalty = 10;
    trend = "WORSENING";
  } else if (simulationStatus === "unusual") {
    simulationPenalty = 5;
  }

  const uncapped = Math.max(0, Math.min(100, Math.round(baseScore - simulationPenalty)));

  // Hard caps: certain findings override the average. LOW starts at 70, so a
  // cap below 70 means the token can never be rated LOW.
  const caps: { max: number; reason: string }[] = [];
  if (ctx.isHoneypot) caps.push({ max: 5, reason: "Honeypot detected" });
  if (ctx.dangerCount >= 3) caps.push({ max: 30, reason: "Multiple critical risk factors" });
  else if (ctx.dangerCount === 2) caps.push({ max: 49, reason: "Two critical risk factors" });
  if (!securityKnown) caps.push({ max: 60, reason: "Security data unavailable" });
  else if (ctx.securityPartial) caps.push({ max: 60, reason: "Security data incomplete" });
  if (!marketKnown) caps.push({ max: 60, reason: "Market data unavailable" });
  if (ctx.honeypotUnknown) caps.push({ max: 69, reason: "Honeypot check incomplete" });
  // Market-level hard caps (new pair, buys with no sells, tiny liquidity)
  // plus the impersonation cap added by this orchestrator
  for (const c of ctx.marketHardCaps || []) {
    if (c && typeof c.max === "number") caps.push({ max: c.max, reason: c.reason });
  }

  let finalScore = uncapped;
  const capReasons = caps.filter((c) => uncapped > c.max).map((c) => c.reason);
  for (const c of caps) {
    if (finalScore > c.max) finalScore = c.max;
  }

  const level = levelFromScore(finalScore);

  // Confidence reflects which data sources actually responded
  const confidence = Math.min(
    0.95,
    0.4 +
      (marketKnown ? 0.2 : 0) +
      (securityKnown && !ctx.securityPartial ? 0.25 : 0) +
      (ctx.simulationAvailable ? 0.1 : 0)
  );

  const dataComplete =
    marketKnown &&
    securityKnown &&
    !ctx.securityPartial &&
    ctx.simulationAvailable &&
    !ctx.honeypotUnknown;

  return { overallScore: finalScore, riskLevel: level, confidence, trend, dataComplete, capReasons };
}

serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const fail = (status: number, error: string) =>
    json(
      {
        success: false,
        error,
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
      status
    );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return fail(401, "Unauthorized");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    // NOTE (Aug 13 2026 fix): an unresolved token is treated as an anonymous
    // visitor instead of being rejected. check-scan-limit gates anonymous usage by IP.
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    console.log(
      `[Orchestrator] Request from ${user ? `user: ${user.id}` : "anonymous visitor"}`
    );

    const body = await req.json();
    const { address, network, includeAI = false } = body;

    // NEW: symbol input (BTC, ETH, SOL, USDT, USDC...) resolves to a
    // registry contract before validation.
    let scanAddress: unknown = address;
    let requestNetwork: string | undefined = network;
    let symbolInput: { inputSymbol: string; native: string | null } | null = null;

    const symbolHit = resolveSymbolInput(address, network);
    if (symbolHit && "error" in symbolHit) {
      return fail(404, symbolHit.error);
    }
    if (symbolHit) {
      scanAddress = symbolHit.asset.address;
      requestNetwork = network || symbolHit.asset.chain;
      symbolInput = { inputSymbol: symbolHit.inputSymbol, native: symbolHit.native };
    }

    if (!scanAddress || !validateAddress(scanAddress)) {
      return fail(400, "Invalid address format");
    }

    // EVM addresses are case-insensitive; Solana/Tron (base58) are case-SENSITIVE
    // and must not be lowercased or downstream lookups fail.
    const trimmedAddress = (scanAddress as string).trim();
    const normalizedAddress = ADDRESS_PATTERNS.evm.test(trimmedAddress)
      ? trimmedAddress.toLowerCase()
      : trimmedAddress;
    console.log(
      `[Orchestrator] Starting analysis for: ${normalizedAddress}${requestNetwork ? ` on ${requestNetwork}` : ""}`
    );

    const marketResult = await callService(
      "market-data-service",
      { address: normalizedAddress, network: requestNetwork },
      authHeader
    );

    if (!marketResult?.data) {
      return fail(404, "Token not found on any DEX");
    }

    const bestPair = marketResult.data.summary.bestPair;
    const detectedNetwork: string = requestNetwork || bestPair?.chainId || "unknown";
    const registryChain = canonicalChain(bestPair?.chainId) ?? canonicalChain(requestNetwork);
    const knownAsset = findKnownAsset(registryChain, normalizedAddress);

    const price = parseFloat(bestPair?.priceUsd) || 0;
    const sources: string[] = ["dexscreener"];
    let allFactors: RiskFactor[] = [];
    let riskAssessment: any;
    let simulationStatus = "normal";
    let securityOut: any;
    let simulationOut: any;
    let knownAssetOut: any = undefined;

    if (knownAsset) {
      // ---- KNOWN ASSET PATH: registry-verified contract ----
      const known = buildKnownAssetAssessment(knownAsset, price);
      allFactors = known.factors;
      riskAssessment = known.riskAssessment;
      sources.push("aidyor-registry");

      securityOut = {
        available: true,
        honeypotUnknown: false,
        isHoneypot: false,
        isVerified: true,
        buyTax: 0,
        sellTax: 0,
        holderCount: 0, // not fetched for registry assets
        isMintable: knownAsset.kind === "stablecoin" && knownAsset.centralized,
        lockInfo: null,
      };
      simulationOut = {
        pumpDumpStatus: "normal",
        confidence: 1,
        recommendation:
          knownAsset.kind === "stablecoin"
            ? "Verified stablecoin contract. Watch the peg and issuer risk."
            : "Verified canonical asset contract. Standard market risk applies.",
      };
      knownAssetOut = {
        symbol: knownAsset.symbol,
        name: knownAsset.name,
        kind: knownAsset.kind,
        chain: knownAsset.chain,
        bridged: knownAsset.bridged,
        centralized: knownAsset.centralized,
        nativeAsset: symbolInput?.native ?? null,
        inputSymbol: symbolInput?.inputSymbol ?? null,
      };

      console.log(
        `[Orchestrator] Known asset: ${knownAsset.symbol} on ${knownAsset.chain}, price=${price}`
      );
    } else {
      // ---- STANDARD PATH: unchanged scanning logic ----
      const [securityResult, simulationResult] = await Promise.all([
        callService(
          "onchain-data-service",
          { address: normalizedAddress, network: detectedNetwork },
          authHeader
        ),
        callService(
          "simulation-engine",
          {
            address: normalizedAddress,
            network: detectedNetwork,
            marketData: {
              price,
              liquidity: marketResult.data.summary.totalLiquidity,
              volume24h: marketResult.data.summary.totalVolume24h,
              change24h: bestPair?.priceChange?.h24 || 0,
              txns24h: bestPair?.txns?.h24,
            },
          },
          authHeader
        ),
      ]);

      if (Array.isArray(marketResult.data.riskMetrics?.factors)) {
        allFactors.push(...marketResult.data.riskMetrics.factors);
      }

      const securityAvailable = !!securityResult?.data;
      const securityPartial = securityResult?.data?.partial === true;
      const simulationAvailable = !!simulationResult?.data;

      if (Array.isArray(securityResult?.data?.factors)) {
        allFactors.push(...securityResult.data.factors);
      }
      if (Array.isArray(securityResult?.data?.sources)) {
        sources.push(...securityResult.data.sources);
      }

      // Never present missing security data as a clean result
      if (!securityAvailable) {
        allFactors.push({
          name: "Security Data",
          status: "warning",
          description:
            "Security scan unavailable. Score is capped and incomplete - do not treat as safe.",
        });
      }

      // NEW: impersonation check. A token using a protected symbol but not
      // listed in the registry is the classic fake-USDT / fake-ETH scam.
      const marketHardCaps: any[] = Array.isArray(marketResult.data.riskMetrics?.hardCaps)
        ? [...marketResult.data.riskMetrics.hardCaps]
        : [];
      const scannedSymbol = String(bestPair?.baseToken?.symbol ?? "").trim().toUpperCase();
      if (PROTECTED_SYMBOLS.has(scannedSymbol)) {
        allFactors.push({
          name: "Possible Impersonation",
          status: "danger",
          description: `Uses the symbol ${scannedSymbol} but is not the official ${scannedSymbol} contract on ${registryChain ?? detectedNetwork}. Verify the contract address before trading.`,
        });
        marketHardCaps.push({
          max: 35,
          reason: `Possible impersonation of ${scannedSymbol}`,
        });
        console.log(
          `[Orchestrator] Impersonation flag: symbol=${scannedSymbol} chain=${registryChain ?? detectedNetwork} address=${normalizedAddress}`
        );
      }

      // Strict parsing: a score of 0 stays 0 (it used to become 50 via `|| 50`)
      const marketScore = asScore(marketResult.data.riskMetrics?.overallScore);
      const securityScore = asScore(securityResult?.data?.riskScore);
      simulationStatus = simulationResult?.data?.pumpDumpStatus || "normal";

      const security = securityResult?.data?.security;
      const isHoneypot = isTruthyFlag(security?.isHoneypot);
      const honeypotUnknown = securityAvailable && security?.honeypotUnknown === true;
      const dangerCount = allFactors.filter((f) => f.status === "danger").length;

      riskAssessment = calculateOverallRisk(marketScore, securityScore, simulationStatus, {
        isHoneypot,
        honeypotUnknown,
        dangerCount,
        securityAvailable,
        securityPartial,
        simulationAvailable,
        marketHardCaps,
      });

      securityOut = {
        available: securityAvailable,
        honeypotUnknown,
        isHoneypot,
        isVerified: isTruthyFlag(security?.isVerified),
        buyTax: security?.buyTax || 0,
        sellTax: security?.sellTax || 0,
        holderCount: security?.holderCount || 0,
        isMintable: isTruthyFlag(security?.isMintable),
        lockInfo: securityResult?.data?.lockInfo || null,
      };
      simulationOut = {
        pumpDumpStatus: simulationStatus,
        confidence: simulationResult?.data?.confidence || 0.5,
        recommendation:
          simulationResult?.data?.prediction?.recommendation ||
          "Standard due diligence recommended.",
      };
    }

    const response: any = {
      success: true,
      data: {
        token: {
          name: bestPair?.baseToken?.name || "Unknown",
          symbol: bestPair?.baseToken?.symbol || "???",
          address: normalizedAddress,
          network: detectedNetwork.toUpperCase(),
          imageUrl: bestPair?.info?.imageUrl,
        },
        riskAssessment,
        marketData: {
          price,
          liquidity: marketResult.data.summary.totalLiquidity,
          volume24h: marketResult.data.summary.totalVolume24h,
          change24h: bestPair?.priceChange?.h24 || 0,
          marketCap: bestPair?.marketCap || bestPair?.fdv || 0,
          chainsFound: marketResult.data.summary.chainsFound,
        },
        securityData: securityOut,
        simulation: simulationOut,
        riskFactors: allFactors,
        sources,
      },
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };

    // NEW field, only present for registry-verified assets
    if (knownAssetOut) {
      response.data.knownAsset = knownAssetOut;
    }

    if (includeAI && response.data) {
      console.log("[Orchestrator] Fetching AI explanation...");
      const aiResult = await callService(
        "ai-risk-engine",
        {
          tokenData: {
            name: response.data.token.name,
            symbol: response.data.token.symbol,
            network: response.data.token.network,
            riskScore: riskAssessment.overallScore,
            riskFactors: allFactors,
            marketData: response.data.marketData,
            securityData: response.data.securityData,
            lockInfo: response.data.securityData.lockInfo,
            pumpDumpStatus: simulationStatus,
          },
        },
        authHeader
      );

      if (aiResult?.data) {
        response.data.aiExplanation = {
          explanation: aiResult.data.explanation,
          keyTakeaways: aiResult.data.keyTakeaways,
          recommendation: aiResult.data.recommendation,
        };
        sources.push("ai-engine");
      }
    }

    console.log(
      `[Orchestrator] Complete: score=${riskAssessment.overallScore}, level=${riskAssessment.riskLevel}, complete=${riskAssessment.dataComplete}, known=${!!knownAsset}, time=${Date.now() - startTime}ms`
    );

    return json(response);
  } catch (error) {
    console.error("[Orchestrator] Error:", error);
    return fail(500, "An error occurred processing your request");
  }
});

