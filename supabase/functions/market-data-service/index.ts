import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const ALLOWED_ORIGINS = [
  'https://aidyor.app',
  'https://www.aidyor.app',
  'http://localhost:5173',
  'http://localhost:8080',
];

function isAllowedOrigin(origin) {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

function getCorsHeaders(origin) {
  const allowedOrigin = isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

const cache = new Map();
const CACHE_TTL = 30000;

const ADDRESS_PATTERNS = {
  evm: /^0x[a-fA-F0-9]{40}$/,
  solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
};

// Every accepted network name maps to the DexScreener chainId.
const NETWORK_ALIASES = {
  eth: 'ethereum', ethereum: 'ethereum',
  bsc: 'bsc', bnb: 'bsc',
  polygon: 'polygon', matic: 'polygon',
  arbitrum: 'arbitrum', arb: 'arbitrum',
  base: 'base',
  optimism: 'optimism', op: 'optimism',
  avalanche: 'avalanche', avax: 'avalanche',
  fantom: 'fantom', ftm: 'fantom',
  solana: 'solana', sol: 'solana',
};

function validateAddress(address) {
  if (!address || typeof address !== 'string' || address.length > 100) return false;
  const a = address.trim();
  return ADDRESS_PATTERNS.evm.test(a) || ADDRESS_PATTERNS.solana.test(a);
}

function validateNetwork(network) {
  if (!network) return true;
  if (typeof network !== 'string' || network.length > 20) return false;
  return !!NETWORK_ALIASES[network.toLowerCase().trim()];
}

// EVM addresses are case-insensitive. Solana (base58) is case-SENSITIVE
// and must never be lowercased.
function normalizeAddress(address) {
  const a = address.trim();
  return ADDRESS_PATTERNS.evm.test(a) ? a.toLowerCase() : a;
}

function getCached(key) {
  const entry = cache.get(key);
  if (entry && entry.expiry > Date.now()) {
    return { ...entry.data, cached: true };
  }
  cache.delete(key);
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

async function fetchDexScreener(address) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(address)}`, { signal: controller.signal });
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

function isBaseToken(pair, address, isEvm) {
  const base = pair?.baseToken?.address || '';
  return isEvm ? base.toLowerCase() === address.toLowerCase() : base === address;
}

// pairs must be sorted by liquidity (highest first).
function analyzeMarketRisk(pairs) {
  const factors = [];
  const caps = []; // hard caps: findings that override the weighted average

  if (pairs.length === 0) {
    return {
      liquidityScore: 0,
      volumeScore: 0,
      txActivityScore: 0,
      priceStabilityScore: 0,
      overallScore: 0,
      capReasons: [],
      hardCaps: [],
      factors: [{ name: "No Market Data", status: "danger", description: "Token not found on any DEX" }],
    };
  }

  const mainPair = pairs[0];
  const liquidity = Number(mainPair.liquidity?.usd) || 0;
  const volume24h = Number(mainPair.volume?.h24) || 0;
  const txns24h = mainPair.txns?.h24;
  const rawChange = mainPair.priceChange?.h24;
  const priceChangeKnown = typeof rawChange === 'number' && Number.isFinite(rawChange);
  const priceChange24h = priceChangeKnown ? rawChange : 0;

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
    caps.push({ max: 39, reason: "Very low liquidity" });
  }

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

  let txActivityScore = 50;
  if (txns24h) {
    const buys = Number(txns24h.buys) || 0;
    const sells = Number(txns24h.sells) || 0;
    const totalTxns = buys + sells;

    // Classic honeypot signature: plenty of buys, nobody able to sell.
    const noSells = sells === 0 && buys >= 20;

    if (noSells) {
      txActivityScore = 0;
      factors.push({ name: "No Sells Recorded", status: "danger", description: `${buys} buys and 0 sells in 24h - possible honeypot` });
      caps.push({ max: 25, reason: "Buys but no sells (possible honeypot)" });
    } else if (totalTxns >= 500) {
      txActivityScore = 100;
      factors.push({ name: "Active Trading", status: "safe", description: `${totalTxns} transactions in 24h` });
    } else if (totalTxns >= 50) {
      txActivityScore = 70;
    } else if (totalTxns < 10) {
      txActivityScore = 20;
      factors.push({ name: "Low Activity", status: "warning", description: "Few trades in 24h" });
    }

    if (!noSells && sells > 0) {
      const ratio = buys / sells;
      if (ratio < 0.3) {
        factors.push({ name: "Sell Pressure", status: "danger", description: "Heavy selling detected" });
        txActivityScore -= 20;
      } else if (ratio > 3) {
        factors.push({ name: "Buy Pressure", status: "safe", description: "Strong buying activity" });
      }
    }
    txActivityScore = Math.max(0, txActivityScore);
  }

  // Pair age: brand-new pairs are the classic rug window
  const created = Number(mainPair.pairCreatedAt);
  if (Number.isFinite(created) && created > 0) {
    const ageHours = (Date.now() - created) / 3600000;
    if (ageHours < 24) {
      factors.push({ name: "Very New Pair", status: "danger", description: `Trading pair created ${Math.max(1, Math.round(ageHours))}h ago` });
      caps.push({ max: 49, reason: "Trading pair is less than 24h old" });
    } else if (ageHours < 168) {
      factors.push({ name: "New Pair", status: "warning", description: `Trading pair is ${Math.round(ageHours / 24)} days old` });
      caps.push({ max: 69, reason: "Trading pair is less than 7 days old" });
    }
  }

  // Missing price-change data is unknown, not "stable"
  let priceStabilityScore = 50;
  if (priceChangeKnown) {
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
  }

  const weighted = Math.round(
    liquidityScore * 0.35 +
    volumeScore * 0.25 +
    txActivityScore * 0.25 +
    priceStabilityScore * 0.15
  );
  let overallScore = Math.max(0, Math.min(100, weighted));

  const capReasons = caps.filter((c) => overallScore > c.max).map((c) => c.reason);
  for (const c of caps) {
    if (overallScore > c.max) overallScore = c.max;
  }

  return {
    liquidityScore,
    volumeScore,
    txActivityScore,
    priceStabilityScore,
    overallScore,
    capReasons,
    hardCaps: caps,
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized", timestamp: new Date().toISOString() }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'));

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    console.log(`[Market Data Service] Request from ${user ? `user: ${user.id}` : 'anonymous visitor'}`);

    const { address, network } = await req.json();

    if (!address || !validateAddress(address)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid address format", timestamp: new Date().toISOString() }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!validateNetwork(network)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid network", timestamp: new Date().toISOString() }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const normalizedAddress = normalizeAddress(address);
    const isEvm = ADDRESS_PATTERNS.evm.test(normalizedAddress);
    const canonicalNetwork = network ? NETWORK_ALIASES[network.toLowerCase().trim()] : null;
    console.log(`[Market Data Service] Fetching data for: ${normalizedAddress}`);

    const cacheKey = `market:${canonicalNetwork || 'any'}:${normalizedAddress}`;
    const cached = getCached(cacheKey);
    if (cached) {
      console.log(`[Market Data Service] Cache hit for ${normalizedAddress}`);
      return new Response(JSON.stringify(cached), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const pairs = await fetchDexScreener(normalizedAddress);

    if (pairs.length === 0) {
      const response = { success: false, error: "Token not found on any DEX", timestamp: new Date().toISOString() };
      return new Response(JSON.stringify(response), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Prefer pairs where the scanned token is the BASE token: priceUsd and
    // price change in a pair always describe the base token.
    const basePairs = pairs.filter((p) => isBaseToken(p, normalizedAddress, isEvm));
    const candidatePairs = basePairs.length > 0 ? basePairs : pairs;

    const filteredPairs = canonicalNetwork
      ? candidatePairs.filter((p) => String(p.chainId).toLowerCase() === canonicalNetwork)
      : candidatePairs;

    // A network filter that matches nothing is "not found", not an empty success
    if (filteredPairs.length === 0) {
      const response = { success: false, error: `Token not found on ${canonicalNetwork}`, timestamp: new Date().toISOString() };
      return new Response(JSON.stringify(response), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sortedPairs = [...filteredPairs].sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));

    const totalLiquidity = sortedPairs.reduce((sum, p) => sum + (p.liquidity?.usd || 0), 0);
    const totalVolume24h = sortedPairs.reduce((sum, p) => sum + (p.volume?.h24 || 0), 0);
    const prices = sortedPairs.map((p) => parseFloat(p.priceUsd) || 0).filter((p) => p > 0);
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    const chainsFound = [...new Set(sortedPairs.map((p) => p.chainId))];
    const bestPair = sortedPairs[0] || null;

    const riskMetrics = analyzeMarketRisk(sortedPairs);

    const response = {
      success: true,
      data: { pairs: sortedPairs, summary: { totalLiquidity, totalVolume24h, avgPrice, chainsFound, bestPair }, riskMetrics },
      cached: false,
      timestamp: new Date().toISOString(),
    };

    setCache(cacheKey, response);

    console.log(`[Market Data Service] Success: ${sortedPairs.length} pairs, score: ${riskMetrics.overallScore}`);

    return new Response(JSON.stringify(response), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[Market Data Service] Error:", error);
    const origin = req.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    return new Response(JSON.stringify({ success: false, error: "An error occurred processing your request", timestamp: new Date().toISOString() }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
