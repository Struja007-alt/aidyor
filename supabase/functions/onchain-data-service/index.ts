import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

// CORS - only allow AIDYOR production and local development origins
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
  const allowedOrigin = isAllowedOrigin(origin)
    ? origin!
    : "https://aidyor.app";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
}

interface OnChainRequest {
  address: string;
  network: string;
}

interface SecurityData {
  isHoneypot: boolean;
  honeypotUnknown?: boolean;
  isVerified: boolean;
  holderCount: number;
  buyTax: number; // percent (e.g. 5 = 5%)
  sellTax: number; // percent
  isMintable: boolean;
  hasHiddenOwner: boolean;
  hasFreezeAuthority?: boolean;
  isProxy?: boolean;
  canSelfDestruct?: boolean;
}

interface LockInfo {
  isLocked: boolean;
  lockPercentage: number;
  unlockDate: string | null;
  lockerPlatform: string | null;
}

interface Factor {
  name: string;
  status: "safe" | "warning" | "danger";
  description: string;
}

interface OnChainResponse {
  success: boolean;
  data?: {
    security: SecurityData;
    lockInfo: LockInfo | null;
    riskScore: number;
    factors: Factor[];
    sources: string[];
    partial: boolean;
  };
  error?: string;
  cached?: boolean;
  timestamp: string;
}

// Simple in-memory cache
const cache = new Map<string, { data: OnChainResponse; expiry: number }>();
const CACHE_TTL = 60000; // 1 minute for security data

// Address validation patterns
const ADDRESS_PATTERNS = {
  evm: /^0x[a-fA-F0-9]{40}$/,
  solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
};

// Every accepted network name maps to one canonical name.
// DexScreener chain IDs (ethereum, solana, avalanche...) and short
// aliases (eth, sol, avax...) both work.
const NETWORK_ALIASES: Record<string, string> = {
  eth: "ethereum",
  ethereum: "ethereum",
  bsc: "bsc",
  bnb: "bsc",
  polygon: "polygon",
  matic: "polygon",
  arbitrum: "arbitrum",
  arb: "arbitrum",
  base: "base",
  optimism: "optimism",
  op: "optimism",
  avalanche: "avalanche",
  avax: "avalanche",
  fantom: "fantom",
  ftm: "fantom",
  solana: "solana",
  sol: "solana",
};

// Canonical network -> GoPlus chain ID
const networkToGoPlusChain: Record<string, string> = {
  ethereum: "1",
  bsc: "56",
  polygon: "137",
  avalanche: "43114",
  arbitrum: "42161",
  base: "8453",
  optimism: "10",
  fantom: "250",
};

function validateAddress(address: string): boolean {
  if (!address || typeof address !== "string" || address.length > 100) {
    return false;
  }
  return (
    ADDRESS_PATTERNS.evm.test(address) ||
    ADDRESS_PATTERNS.solana.test(address)
  );
}

function normalizeNetwork(network: string): string | null {
  if (!network || typeof network !== "string" || network.length > 20) {
    return null;
  }
  return NETWORK_ALIASES[network.toLowerCase().trim()] || null;
}

function getCached(key: string): OnChainResponse | null {
  const entry = cache.get(key);
  if (entry && entry.expiry > Date.now()) {
    return { ...entry.data, cached: true };
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: OnChainResponse): void {
  cache.set(key, {
    data,
    expiry: Date.now() + CACHE_TTL,
  });
}

async function fetchGoPlusSecurity(
  address: string,
  network: string
): Promise<any> {
  const chainId = networkToGoPlusChain[network];
  if (!chainId) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(
      `https://api.gopluslabs.io/api/v1/token_security/${chainId}?contract_addresses=${encodeURIComponent(
        address
      )}`,
      { signal: controller.signal }
    );

    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json();
    return data.result?.[address.toLowerCase()] || null;
  } catch (error) {
    clearTimeout(timeout);
    console.error("[OnChain Data Service] GoPlus fetch error");
    return null;
  }
}

async function fetchBSCTraceSecurity(address: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(
      `https://api.bsctrace.com/v2/contract/info?address=${encodeURIComponent(
        address
      )}`,
      { signal: controller.signal }
    );

    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json();
    return data.data || null;
  } catch (error) {
    clearTimeout(timeout);
    console.error("[OnChain Data Service] BSCTrace fetch error");
    return null;
  }
}

async function fetchRugCheck(address: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(
      `https://api.rugcheck.xyz/v1/tokens/${encodeURIComponent(
        address
      )}/report`,
      { signal: controller.signal }
    );

    clearTimeout(timeout);

    if (!response.ok) return null;

    return await response.json();
  } catch (error) {
    clearTimeout(timeout);
    console.error("[OnChain Data Service] RugCheck fetch error");
    return null;
  }
}

async function fetchSolanaFM(address: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(
      `https://api.solana.fm/v1/tokens/${encodeURIComponent(address)}`,
      { signal: controller.signal }
    );

    clearTimeout(timeout);

    if (!response.ok) return null;

    return await response.json();
  } catch (error) {
    clearTimeout(timeout);
    console.error("[OnChain Data Service] SolanaFM fetch error");
    return null;
  }
}

async function fetchUnicryptLock(
  address: string
): Promise<LockInfo | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(
      `https://api.unicrypt.network/api/v1/token-locks?token=${encodeURIComponent(
        address
      )}`,
      { signal: controller.signal }
    );

    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json();

    if (!data.locks || data.locks.length === 0) return null;

    const bestLock = data.locks.sort(
      (a: any, b: any) => b.amount - a.amount
    )[0];

    return {
      isLocked: true,
      lockPercentage: bestLock.percentage || 0,
      unlockDate: bestLock.unlockDate || null,
      lockerPlatform: "Unicrypt",
    };
  } catch (error) {
    clearTimeout(timeout);
    console.error("[OnChain Data Service] Unicrypt fetch error");
    return null;
  }
}

// GoPlus flags arrive as "1"/"0" strings; "" or missing means unknown.
function flag(value: unknown): boolean {
  return value === "1" || value === 1 || value === true;
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function analyzeSecurityData(
  goplusData: any,
  bscTraceData: any,
  rugCheckData: any,
  solanaFMData: any,
  network: string // canonical
): {
  security: SecurityData;
  score: number;
  factors: Factor[];
  partial: boolean;
} {
  const factors: Factor[] = [];
  let score = 50; // Base score
  let partial = false;

  const security: SecurityData = {
    isHoneypot: false,
    honeypotUnknown: false,
    isVerified: false,
    holderCount: 0,
    buyTax: 0,
    sellTax: 0,
    isMintable: false,
    hasHiddenOwner: false,
    hasFreezeAuthority: false,
    isProxy: false,
    canSelfDestruct: false,
  };

  // Analyze GoPlus data (EVM chains)
  if (goplusData) {
    security.isHoneypot = flag(goplusData.is_honeypot);
    security.isVerified = flag(goplusData.is_open_source);
    security.holderCount = parseInt(goplusData.holder_count) || 0;
    security.isMintable = flag(goplusData.is_mintable);
    security.hasHiddenOwner = flag(goplusData.hidden_owner);
    security.isProxy = flag(goplusData.is_proxy);
    security.canSelfDestruct = flag(goplusData.selfdestruct);

    // Taxes: GoPlus returns fractions ("0.05"), converted to percent here.
    // Empty string = GoPlus could not simulate, so it is unknown, not 0%.
    const taxUnknown =
      !hasValue(goplusData.buy_tax) || !hasValue(goplusData.sell_tax);
    security.buyTax = (parseFloat(goplusData.buy_tax) || 0) * 100;
    security.sellTax = (parseFloat(goplusData.sell_tax) || 0) * 100;

    // Honeypot: "" or missing = simulation did not run. Unknown is not safe.
    if (!hasValue(goplusData.is_honeypot)) {
      security.honeypotUnknown = true;
      factors.push({
        name: "Honeypot Check Incomplete",
        status: "warning",
        description: "Sell simulation did not run - cannot confirm tradable",
      });
      score -= 15;
    }

    if (taxUnknown) {
      factors.push({
        name: "Tax Data Unavailable",
        status: "warning",
        description: "Buy/sell tax could not be simulated",
      });
      score -= 5;
    }

    if (security.isHoneypot) {
      factors.push({
        name: "Honeypot Detected",
        status: "danger",
        description: "Cannot sell tokens",
      });
      score -= 50;
    }

    if (flag(goplusData.cannot_sell_all)) {
      factors.push({
        name: "Sell Restriction",
        status: "danger",
        description: "Holders cannot sell their full balance",
      });
      score -= 25;
    }

    if (flag(goplusData.cannot_buy)) {
      factors.push({
        name: "Buying Disabled",
        status: "danger",
        description: "Token cannot be bought",
      });
      score -= 20;
    }

    if (flag(goplusData.owner_change_balance)) {
      factors.push({
        name: "Owner Can Change Balances",
        status: "danger",
        description: "Owner can modify holder balances",
      });
      score -= 25;
    }

    if (flag(goplusData.can_take_back_ownership)) {
      factors.push({
        name: "Ownership Can Be Reclaimed",
        status: "danger",
        description: "Renounced ownership can be taken back",
      });
      score -= 20;
    }

    if (flag(goplusData.honeypot_with_same_creator)) {
      factors.push({
        name: "Creator Linked to Honeypots",
        status: "danger",
        description: "Same creator deployed honeypot tokens",
      });
      score -= 25;
    }

    if (flag(goplusData.transfer_pausable)) {
      factors.push({
        name: "Transfers Can Be Paused",
        status: "warning",
        description: "Owner can pause all transfers",
      });
      score -= 10;
    }

    if (flag(goplusData.is_blacklisted)) {
      factors.push({
        name: "Blacklist Function",
        status: "warning",
        description: "Owner can block addresses from trading",
      });
      score -= 10;
    }

    if (flag(goplusData.slippage_modifiable)) {
      factors.push({
        name: "Modifiable Tax",
        status: "warning",
        description: "Owner can change buy/sell tax",
      });
      score -= 10;
    }

    if (security.isVerified) {
      factors.push({
        name: "Verified Contract",
        status: "safe",
        description: "Source code is public",
      });
      score += 10;
    } else {
      factors.push({
        name: "Unverified Contract",
        status: "warning",
        description: "Source code hidden",
      });
      score -= 10;
    }

    if (security.buyTax > 10 || security.sellTax > 10) {
      factors.push({
        name: "High Taxes",
        status: "danger",
        description: `Buy: ${security.buyTax.toFixed(
          1
        )}%, Sell: ${security.sellTax.toFixed(1)}%`,
      });
      score -= 20;
    } else if (security.buyTax > 5 || security.sellTax > 5) {
      factors.push({
        name: "Moderate Taxes",
        status: "warning",
        description: `Buy: ${security.buyTax.toFixed(
          1
        )}%, Sell: ${security.sellTax.toFixed(1)}%`,
      });
      score -= 10;
    }

    if (security.isMintable) {
      factors.push({
        name: "Mintable Supply",
        status: "danger",
        description: "Token supply can be increased",
      });
      score -= 15;
    }

    if (security.hasHiddenOwner) {
      factors.push({
        name: "Hidden Owner",
        status: "danger",
        description: "Ownership is obscured",
      });
      score -= 20;
    }

    if (security.canSelfDestruct) {
      factors.push({
        name: "Self-Destruct Risk",
        status: "danger",
        description: "Contract can be destroyed",
      });
      score -= 25;
    }

    if (security.holderCount >= 1000) {
      factors.push({
        name: "Many Holders",
        status: "safe",
        description: `${security.holderCount.toLocaleString()} holders`,
      });
      score += 10;
    } else if (security.holderCount < 50) {
      factors.push({
        name: "Few Holders",
        status: "warning",
        description: `Only ${security.holderCount} holders`,
      });
      score -= 10;
    }
  }

  // Merge BSCTrace data for BSC
  if (bscTraceData && network === "bsc") {
    if (bscTraceData.isHoneypot && !security.isHoneypot) {
      security.isHoneypot = true;
      factors.push({
        name: "Honeypot (BSCTrace)",
        status: "danger",
        description: "Confirmed by BSCTrace",
      });
      score -= 30;
    }
  }

  // Analyze RugCheck data (Solana)
  if (network === "solana") {
    if (!rugCheckData) {
      // Without RugCheck there is no real Solana security signal.
      partial = true;
      factors.push({
        name: "RugCheck Unavailable",
        status: "warning",
        description: "Solana security scan incomplete - not verified safe",
      });
      score = Math.min(score, 40);
    } else {
      // RugCheck: HIGHER score = MORE risk. Use the explicit risk list and
      // the rugged flag rather than the numeric score.
      if (rugCheckData.rugged === true) {
        factors.push({
          name: "Token Rugged",
          status: "danger",
          description: "RugCheck flags this token as rugged",
        });
        score = Math.min(score, 5);
      }

      if (Array.isArray(rugCheckData.risks)) {
        const risks = rugCheckData.risks;
        const dangerRisks = risks.filter(
          (r: any) => String(r?.level).toLowerCase() === "danger"
        );
        const warnRisks = risks.filter(
          (r: any) => String(r?.level).toLowerCase() === "warn"
        );

        if (dangerRisks.length > 0) {
          const names = dangerRisks
            .slice(0, 3)
            .map((r: any) => r?.name || "Unnamed risk")
            .join(", ");
          factors.push({
            name: "RugCheck Critical",
            status: "danger",
            description: names,
          });
          score -= 25;
          score = Math.min(score, 30);
        } else if (warnRisks.length > 0) {
          const names = warnRisks
            .slice(0, 3)
            .map((r: any) => r?.name || "Unnamed risk")
            .join(", ");
          factors.push({
            name: "RugCheck Warning",
            status: "warning",
            description: names,
          });
          score -= 10;
        } else if (rugCheckData.rugged !== true) {
          factors.push({
            name: "RugCheck: No Risks Flagged",
            status: "safe",
            description: "No risks reported by RugCheck",
          });
          score += 10;
        }
      } else {
        // Response shape unexpected: do not treat as clean.
        partial = true;
        factors.push({
          name: "RugCheck Incomplete",
          status: "warning",
          description: "RugCheck returned no risk list",
        });
        score -= 15;
        score = Math.min(score, 40);
      }

      // Authorities live at the top level of the report (null when revoked)
      const mintAuthority =
        rugCheckData.mintAuthority ??
        rugCheckData.token?.mintAuthority ??
        rugCheckData.tokenMeta?.mintAuthority;
      const freezeAuthority =
        rugCheckData.freezeAuthority ??
        rugCheckData.token?.freezeAuthority ??
        rugCheckData.tokenMeta?.freezeAuthority;

      if (hasValue(mintAuthority)) {
        security.isMintable = true;
        factors.push({
          name: "Mint Authority",
          status: "danger",
          description: "Mint authority not revoked",
        });
        score -= 15;
      }

      if (hasValue(freezeAuthority)) {
        security.hasFreezeAuthority = true;
        factors.push({
          name: "Freeze Authority",
          status: "danger",
          description: "Can freeze token transfers",
        });
        score -= 15;
      }

      // Check top holder concentration
      if (rugCheckData.topHolders?.length > 0) {
        const topHolderPct = rugCheckData.topHolders[0]?.pct || 0;
        if (topHolderPct > 50) {
          factors.push({
            name: "High Concentration",
            status: "danger",
            description: `Top holder owns ${topHolderPct.toFixed(1)}%`,
          });
          score -= 20;
        } else if (topHolderPct > 20) {
          factors.push({
            name: "Concentrated Holdings",
            status: "warning",
            description: `Top holder owns ${topHolderPct.toFixed(1)}%`,
          });
          score -= 10;
        }
      }
    }
  }

  // Analyze SolanaFM data
  if (solanaFMData && network === "solana") {
    if (solanaFMData.holderCount) {
      security.holderCount = parseInt(solanaFMData.holderCount) || 0;
    }
  }

  // A confirmed honeypot can never score above 10
  if (security.isHoneypot) {
    score = Math.min(score, 10);
  }

  return {
    security,
    score: Math.max(0, Math.min(100, score)),
    factors,
    partial,
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Unauthorized",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Unauthorized",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log(`[OnChain Data Service] Request from user: ${user.id}`);

    const { address, network }: OnChainRequest = await req.json();

    if (!address || !validateAddress(address)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid address format",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const net = normalizeNetwork(network);
    if (!net) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid network",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // EVM addresses are case-insensitive. Solana (base58) addresses are
    // case-SENSITIVE and must never be lowercased.
    const trimmedAddress = address.trim();
    const normalizedAddress = ADDRESS_PATTERNS.evm.test(trimmedAddress)
      ? trimmedAddress.toLowerCase()
      : trimmedAddress;

    console.log(
      `[OnChain Data Service] Fetching security for: ${normalizedAddress} on ${net}`
    );

    // Check cache
    const cacheKey = `onchain:${net}:${normalizedAddress}`;
    const cached = getCached(cacheKey);
    if (cached) {
      console.log(
        `[OnChain Data Service] Cache hit for ${normalizedAddress}`
      );
      return new Response(JSON.stringify(cached), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    const sources: string[] = [];

    // Fetch data based on network
    let goplusData = null;
    let bscTraceData = null;
    let rugCheckData = null;
    let solanaFMData = null;
    let lockInfo: LockInfo | null = null;

    if (net === "solana") {
      // Solana: Use RugCheck + SolanaFM
      [rugCheckData, solanaFMData] = await Promise.all([
        fetchRugCheck(normalizedAddress),
        fetchSolanaFM(normalizedAddress),
      ]);

      if (rugCheckData) sources.push("rugcheck");
      if (solanaFMData) sources.push("solanafm");
    } else {
      // EVM: Use GoPlus + optional BSCTrace
      const promises: Promise<any>[] = [
        fetchGoPlusSecurity(normalizedAddress, net),
        fetchUnicryptLock(normalizedAddress),
      ];

      if (net === "bsc") {
        promises.push(fetchBSCTraceSecurity(normalizedAddress));
      }

      const results = await Promise.all(promises);
      goplusData = results[0];
      lockInfo = results[1];
      bscTraceData = results[2] || null;

      if (goplusData) sources.push("goplus");
      if (bscTraceData) sources.push("bsctrace");
      if (lockInfo) sources.push("unicrypt");
    }

    if (!goplusData && !rugCheckData && !solanaFMData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Unable to fetch security data",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 502,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Analyze security
    const { security, score, factors, partial } = analyzeSecurityData(
      goplusData,
      bscTraceData,
      rugCheckData,
      solanaFMData,
      net
    );

    const response: OnChainResponse = {
      success: true,
      data: {
        security,
        lockInfo,
        riskScore: score,
        factors,
        sources,
        partial,
      },
      cached: false,
      timestamp: new Date().toISOString(),
    };

    // Cache only complete results so a partial scan is not served again
    if (!partial) {
      setCache(cacheKey, response);
    }

    console.log(
      `[OnChain Data Service] Success: score ${score}, partial=${partial}, sources: ${sources.join(
        ", "
      )}`
    );

    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("[OnChain Data Service] Error:", error);

    const origin = req.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);

    return new Response(
      JSON.stringify({
        success: false,
        error: "An error occurred processing your request",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
