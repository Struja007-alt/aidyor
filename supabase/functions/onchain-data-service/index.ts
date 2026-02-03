import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Dynamic CORS - restrict to allowed origins
const ALLOWED_ORIGINS = [
  'https://id-preview--eaa8d564-cf6a-4d6f-81e2-0ddab66a4a49.lovable.app',
  'https://aidyor.lovable.app',
  'https://aidyor.app',
  'https://www.aidyor.app',
  'http://localhost:5173',
  'http://localhost:8080',
];

// Allow Lovable preview domains dynamically
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (origin.endsWith('.lovableproject.com') || origin.endsWith('.lovable.app')) return true;
  return false;
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = isAllowedOrigin(origin) ? origin! : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

interface OnChainRequest {
  address: string;
  network: string;
}

interface SecurityData {
  isHoneypot: boolean;
  isVerified: boolean;
  holderCount: number;
  buyTax: number;
  sellTax: number;
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

interface OnChainResponse {
  success: boolean;
  data?: {
    security: SecurityData;
    lockInfo: LockInfo | null;
    riskScore: number;
    factors: { name: string; status: "safe" | "warning" | "danger"; description: string }[];
    sources: string[];
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

const VALID_NETWORKS = ['eth', 'ethereum', 'bsc', 'polygon', 'arbitrum', 'base', 'optimism', 'avalanche', 'sol', 'solana', 'arb', 'op', 'avax'];

function validateAddress(address: string): boolean {
  if (!address || typeof address !== 'string' || address.length > 100) return false;
  return ADDRESS_PATTERNS.evm.test(address) || ADDRESS_PATTERNS.solana.test(address);
}

function validateNetwork(network: string): boolean {
  if (!network || typeof network !== 'string' || network.length > 20) return false;
  return VALID_NETWORKS.includes(network.toLowerCase());
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
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

// Network to GoPlus chain ID mapping
const networkToGoPlusChain: Record<string, string> = {
  eth: "1",
  ethereum: "1",
  bsc: "56",
  polygon: "137",
  avax: "43114",
  arb: "42161",
  arbitrum: "42161",
  base: "8453",
  op: "10",
  optimism: "10",
};

async function fetchGoPlusSecurity(address: string, network: string): Promise<any> {
  const chainId = networkToGoPlusChain[network.toLowerCase()];
  if (!chainId) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(
      `https://api.gopluslabs.io/api/v1/token_security/${chainId}?contract_addresses=${encodeURIComponent(address)}`,
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
      `https://api.bsctrace.com/v2/contract/info?address=${encodeURIComponent(address)}`,
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
      `https://api.rugcheck.xyz/v1/tokens/${encodeURIComponent(address)}/report`,
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

async function fetchUnicryptLock(address: string): Promise<LockInfo | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(
      `https://api.unicrypt.network/api/v1/token-locks?token=${encodeURIComponent(address)}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.locks || data.locks.length === 0) return null;

    const bestLock = data.locks.sort((a: any, b: any) => b.amount - a.amount)[0];
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

function analyzeSecurityData(
  goplusData: any,
  bscTraceData: any,
  rugCheckData: any,
  solanaFMData: any,
  network: string
): { security: SecurityData; score: number; factors: { name: string; status: "safe" | "warning" | "danger"; description: string }[] } {
  const factors: { name: string; status: "safe" | "warning" | "danger"; description: string }[] = [];
  let score = 50; // Base score

  const security: SecurityData = {
    isHoneypot: false,
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
    security.isHoneypot = goplusData.is_honeypot === "1";
    security.isVerified = goplusData.is_open_source === "1";
    security.holderCount = parseInt(goplusData.holder_count) || 0;
    security.buyTax = parseFloat(goplusData.buy_tax) * 100 || 0;
    security.sellTax = parseFloat(goplusData.sell_tax) * 100 || 0;
    security.isMintable = goplusData.is_mintable === "1";
    security.hasHiddenOwner = goplusData.hidden_owner === "1";
    security.isProxy = goplusData.is_proxy === "1";
    security.canSelfDestruct = goplusData.selfdestruct === "1";

    if (security.isHoneypot) {
      factors.push({ name: "Honeypot Detected", status: "danger", description: "Cannot sell tokens" });
      score -= 50;
    }

    if (security.isVerified) {
      factors.push({ name: "Verified Contract", status: "safe", description: "Source code is public" });
      score += 10;
    } else {
      factors.push({ name: "Unverified Contract", status: "warning", description: "Source code hidden" });
      score -= 10;
    }

    if (security.buyTax > 10 || security.sellTax > 10) {
      factors.push({ name: "High Taxes", status: "danger", description: `Buy: ${security.buyTax.toFixed(1)}%, Sell: ${security.sellTax.toFixed(1)}%` });
      score -= 20;
    } else if (security.buyTax > 5 || security.sellTax > 5) {
      factors.push({ name: "Moderate Taxes", status: "warning", description: `Buy: ${security.buyTax.toFixed(1)}%, Sell: ${security.sellTax.toFixed(1)}%` });
      score -= 10;
    }

    if (security.isMintable) {
      factors.push({ name: "Mintable Supply", status: "danger", description: "Token supply can be increased" });
      score -= 15;
    }

    if (security.hasHiddenOwner) {
      factors.push({ name: "Hidden Owner", status: "danger", description: "Ownership is obscured" });
      score -= 20;
    }

    if (security.canSelfDestruct) {
      factors.push({ name: "Self-Destruct Risk", status: "danger", description: "Contract can be destroyed" });
      score -= 25;
    }

    if (security.holderCount >= 1000) {
      factors.push({ name: "Many Holders", status: "safe", description: `${security.holderCount.toLocaleString()} holders` });
      score += 10;
    } else if (security.holderCount < 50) {
      factors.push({ name: "Few Holders", status: "warning", description: `Only ${security.holderCount} holders` });
      score -= 10;
    }
  }

  // Merge BSCTrace data for BSC
  if (bscTraceData && network.toLowerCase() === "bsc") {
    if (bscTraceData.isHoneypot && !security.isHoneypot) {
      security.isHoneypot = true;
      factors.push({ name: "Honeypot (BSCTrace)", status: "danger", description: "Confirmed by BSCTrace" });
      score -= 30;
    }
  }

  // Analyze RugCheck data (Solana)
  if (rugCheckData && network.toLowerCase() === "sol") {
    const rugScore = rugCheckData.score || 0;
    if (rugScore < 20) {
      factors.push({ name: "RugCheck Critical", status: "danger", description: `Score: ${rugScore}/100` });
      score = Math.min(score, 25);
    } else if (rugScore < 50) {
      factors.push({ name: "RugCheck Warning", status: "warning", description: `Score: ${rugScore}/100` });
      score -= 15;
    } else {
      factors.push({ name: "RugCheck OK", status: "safe", description: `Score: ${rugScore}/100` });
      score += 10;
    }

    if (rugCheckData.tokenMeta?.mintAuthority) {
      security.isMintable = true;
      factors.push({ name: "Mint Authority", status: "danger", description: "Mint authority not revoked" });
      score -= 15;
    }

    if (rugCheckData.tokenMeta?.freezeAuthority) {
      security.hasFreezeAuthority = true;
      factors.push({ name: "Freeze Authority", status: "danger", description: "Can freeze token transfers" });
      score -= 15;
    }

    // Check top holder concentration
    if (rugCheckData.topHolders?.length > 0) {
      const topHolderPct = rugCheckData.topHolders[0]?.pct || 0;
      if (topHolderPct > 50) {
        factors.push({ name: "High Concentration", status: "danger", description: `Top holder owns ${topHolderPct.toFixed(1)}%` });
        score -= 20;
      } else if (topHolderPct > 20) {
        factors.push({ name: "Concentrated Holdings", status: "warning", description: `Top holder owns ${topHolderPct.toFixed(1)}%` });
        score -= 10;
      }
    }
  }

  // Analyze SolanaFM data
  if (solanaFMData && network.toLowerCase() === "sol") {
    if (solanaFMData.holderCount) {
      security.holderCount = parseInt(solanaFMData.holderCount) || 0;
    }
  }

  return {
    security,
    score: Math.max(0, Math.min(100, score)),
    factors,
  };
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized", timestamp: new Date().toISOString() }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized", timestamp: new Date().toISOString() }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[OnChain Data Service] Request from user: ${user.id}`);

    const { address, network }: OnChainRequest = await req.json();

    if (!address || !validateAddress(address)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid address format", timestamp: new Date().toISOString() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!network || !validateNetwork(network)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid network", timestamp: new Date().toISOString() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedAddress = address.toLowerCase().trim();
    console.log(`[OnChain Data Service] Fetching security for: ${normalizedAddress} on ${network}`);

    // Check cache
    const cacheKey = `onchain:${network}:${normalizedAddress}`;
    const cached = getCached(cacheKey);
    if (cached) {
      console.log(`[OnChain Data Service] Cache hit for ${normalizedAddress}`);
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sources: string[] = [];

    // Fetch data based on network
    let goplusData = null;
    let bscTraceData = null;
    let rugCheckData = null;
    let solanaFMData = null;
    let lockInfo: LockInfo | null = null;

    if (network.toLowerCase() === "sol") {
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
        fetchGoPlusSecurity(normalizedAddress, network),
        fetchUnicryptLock(normalizedAddress),
      ];

      if (network.toLowerCase() === "bsc") {
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
        JSON.stringify({ success: false, error: "Unable to fetch security data", timestamp: new Date().toISOString() }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Analyze security
    const { security, score, factors } = analyzeSecurityData(
      goplusData,
      bscTraceData,
      rugCheckData,
      solanaFMData,
      network
    );

    const response: OnChainResponse = {
      success: true,
      data: {
        security,
        lockInfo,
        riskScore: score,
        factors,
        sources,
      },
      cached: false,
      timestamp: new Date().toISOString(),
    };

    // Cache the response
    setCache(cacheKey, response);

    console.log(`[OnChain Data Service] Success: score ${score}, sources: ${sources.join(", ")}`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[OnChain Data Service] Error:", error);
    const origin = req.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    return new Response(
      JSON.stringify({
        success: false,
        error: "An error occurred processing your request",
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
