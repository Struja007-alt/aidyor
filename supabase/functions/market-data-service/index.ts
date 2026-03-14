import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

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

interface MarketDataRequest {
  address: string;
  network?: string;
}

interface DexPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  liquidity?: { usd: number };
  volume?: { h24: number; h6: number; h1: number; m5: number };
  priceChange?: { h24: number; h6: number; h1: number; m5: number };
  txns?: {
    h24: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    m5: { buys: number; sells: number };
  };
  fdv?: number;
  marketCap?: number;
  info?: {
    imageUrl?: string;
    websites?: { label: string; url: string }[];
    socials?: { type: string; url: string }[];
  };
}

interface MarketDataResponse {
  success: boolean;
  data?: {
    pairs: DexPair[];
    summary: {
      totalLiquidity: number;
      totalVolume24h: number;
      avgPrice: number;
      chainsFound: string[];
      bestPair: DexPair | null;
    };
    riskMetrics: {
      liquidityScore: number;
      volumeScore: number;
      txActivityScore: number;
      priceStabilityScore: number;
      overallScore: number;
      factors: { name: string; status: "safe" | "warning" | "danger"; description: string }[];
    };
  };
  error?: string;
  cached?: boolean;
  timestamp: string;
}

// Simple in-memory cache with TTL
const cache = new Map<string, { data: MarketDataResponse; expiry: number }>();
const CACHE_TTL = 30000; // 30 seconds

// Address validation patterns
const ADDRESS_PATTERNS = {
  evm: /^0x[a-fA-F0-9]{40}$/,
  solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
};

const VALID_NETWORKS = ['eth', 'ethereum', 'bsc', 'polygon', 'arbitrum', 'base', 'optimism', 'avalanche', 'sol', 'solana'];

function validateAddress(address: string): boolean {
  if (!address || typeof address !== 'string' || address.length > 100) return false;
  return ADDRESS_PATTERNS.evm.test(address) || ADDRESS_PATTERNS.solana.test(address);
}

function validateNetwork(network: string | undefined): boolean {
  if (!network) return true;
  if (typeof network !== 'string' || network.length > 20) return false;
  return VALID_NETWORKS.includes(network.toLowerCase());
}

function getCached(key: string): MarketDataResponse | null {
  const entry = cache.get(key);
  if (entry && entry.expiry > Date.now()) {
    return { ...entry.data, cached: true };
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: MarketDataResponse): void {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

async function fetchDexScreener(address: string): Promise<DexPair[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(address)}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`[Market Data Service] DexScreener API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.pairs || [];
  } catch (error) {
    clearTimeout(timeout);
    console.error("[Market Data Service] DexScreener fetch error");
    return [];
  }
}

function analyzeMarketRisk(pairs: DexPair[]): { liquidityScore: number; volumeScore: number; txActivityScore: number; priceStabilityScore: number; overallScore: number; factors: { name: string; status: "safe" | "warning" | "danger"; description: string }[] } {
  const factors: { name: string; status: "safe" | "warning" | "danger"; description: string }[] = [];
  
  if (pairs.length === 0) {
    return {
      liquidityScore: 0,
      volumeScore: 0,
      txActivityScore: 0,
      priceStabilityScore: 0,
      overallScore: 0,
      factors: [{ name: "No Market Data", status: "danger", description: "Token not found on any DEX" }],
    };
  }

  const mainPair = pairs[0];
  const liquidity = mainPair.liquidity?.usd || 0;
  const volume24h = mainPair.volume?.h24 || 0;
  const txns24h = mainPair.txns?.h24;
  const priceChange24h = mainPair.priceChange?.h24 || 0;

  // Liquidity Score (0-100)
  let liquidityScore = 0;
  if (liquidity >= 500000) {
    liquidityScore = 100;
    factors.push({ name: "Strong Liquidity", status: "safe", description: `$${(liquidity/1000).toFixed(0)}K liquidity` });
  } else if (liquidity >= 100000) {
    liquidityScore = 80;
    factors.push({ name: "Good Liquidity", status: "safe", description: `$${(liquidity/1000).toFixed(0)}K liquidity` });
  } else if (liquidity >= 10000) {
    liquidityScore = 50;
    factors.push({ name: "Low Liquidity", status: "warning", description: `$${(liquidity/1000).toFixed(0)}K liquidity` });
  } else {
    liquidityScore = 20;
    factors.push({ name: "Very Low Liquidity", status: "danger", description: `$${liquidity.toFixed(0)} liquidity` });
  }

  // Volume Score (0-100)
  let volumeScore = 0;
  if (volume24h >= 100000) {
    volumeScore = 100;
    factors.push({ name: "High Volume", status: "safe", description: `$${(volume24h/1000).toFixed(0)}K 24h volume` });
  } else if (volume24h >= 10000) {
    volumeScore = 70;
  } else if (volume24h >= 1000) {
    volumeScore = 40;
    factors.push({ name: "Low Volume", status: "warning", description: `$${volume24h.toFixed(0)} 24h volume` });
  } else {
    volumeScore = 10;
    factors.push({ name: "Very Low Volume", status: "danger", description: "Minimal trading activity" });
  }

  // TX Activity Score (0-100)
  let txActivityScore = 50;
  if (txns24h) {
    const totalTxns = txns24h.buys + txns24h.sells;
    if (totalTxns >= 500) {
      txActivityScore = 100;
      factors.push({ name: "Active Trading", status: "safe", description: `${totalTxns} transactions in 24h` });
    } else if (totalTxns >= 50) {
      txActivityScore = 70;
    } else if (totalTxns < 10) {
      txActivityScore = 20;
      factors.push({ name: "Low Activity", status: "warning", description: "Few trades in 24h" });
    }

    // Check buy/sell ratio
    if (txns24h.sells > 0) {
      const ratio = txns24h.buys / txns24h.sells;
      if (ratio < 0.3) {
        factors.push({ name: "Sell Pressure", status: "danger", description: "Heavy selling detected" });
        txActivityScore -= 20;
      } else if (ratio > 3) {
        factors.push({ name: "Buy Pressure", status: "safe", description: "Strong buying activity" });
      }
    }
  }

  // Price Stability Score (0-100)
  let priceStabilityScore = 50;
  const absChange = Math.abs(priceChange24h);
  if (absChange < 5) {
    priceStabilityScore = 100;
    factors.push({ name: "Stable Price", status: "safe", description: "Low volatility" });
  } else if (absChange < 20) {
    priceStabilityScore = 70;
  } else if (absChange < 50) {
    priceStabilityScore = 40;
    factors.push({ name: "Volatile", status: "warning", description: `${priceChange24h.toFixed(1)}% change` });
  } else {
    priceStabilityScore = 10;
    factors.push({ name: "Extreme Volatility", status: "danger", description: `${priceChange24h.toFixed(1)}% change` });
  }

  // Overall Score (weighted average)
  const overallScore = Math.round(
    liquidityScore * 0.35 +
    volumeScore * 0.25 +
    txActivityScore * 0.25 +
    priceStabilityScore * 0.15
  );

  return {
    liquidityScore,
    volumeScore,
    txActivityScore,
    priceStabilityScore,
    overallScore: Math.max(0, Math.min(100, overallScore)),
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

    console.log(`[Market Data Service] Request from user: ${user.id}`);

    const { address, network }: MarketDataRequest = await req.json();

    if (!address || !validateAddress(address)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid address format", timestamp: new Date().toISOString() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!validateNetwork(network)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid network", timestamp: new Date().toISOString() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedAddress = address.toLowerCase().trim();
    console.log(`[Market Data Service] Fetching data for: ${normalizedAddress}`);

    // Check cache
    const cacheKey = `market:${normalizedAddress}`;
    const cached = getCached(cacheKey);
    if (cached) {
      console.log(`[Market Data Service] Cache hit for ${normalizedAddress}`);
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch from DexScreener
    const pairs = await fetchDexScreener(normalizedAddress);

    if (pairs.length === 0) {
      const response: MarketDataResponse = {
        success: false,
        error: "Token not found on any DEX",
        timestamp: new Date().toISOString(),
      };
      return new Response(JSON.stringify(response), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter by network if specified
    const filteredPairs = network
      ? pairs.filter((p) => p.chainId.toLowerCase() === network.toLowerCase())
      : pairs;

    // Calculate summary
    const totalLiquidity = filteredPairs.reduce((sum, p) => sum + (p.liquidity?.usd || 0), 0);
    const totalVolume24h = filteredPairs.reduce((sum, p) => sum + (p.volume?.h24 || 0), 0);
    const prices = filteredPairs.map((p) => parseFloat(p.priceUsd) || 0).filter((p) => p > 0);
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    const chainsFound = [...new Set(filteredPairs.map((p) => p.chainId))];
    const bestPair = filteredPairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0] || null;

    // Analyze risk
    const riskMetrics = analyzeMarketRisk(filteredPairs);

    const response: MarketDataResponse = {
      success: true,
      data: {
        pairs: filteredPairs,
        summary: {
          totalLiquidity,
          totalVolume24h,
          avgPrice,
          chainsFound,
          bestPair,
        },
        riskMetrics,
      },
      cached: false,
      timestamp: new Date().toISOString(),
    };

    // Cache the response
    setCache(cacheKey, response);

    console.log(`[Market Data Service] Success: ${filteredPairs.length} pairs, score: ${riskMetrics.overallScore}`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Market Data Service] Error:", error);
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
