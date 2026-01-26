import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Dynamic CORS - restrict to allowed origins
const ALLOWED_ORIGINS = [
  'https://id-preview--eaa8d564-cf6a-4d6f-81e2-0ddab66a4a49.lovable.app',
  'https://aidyor.app',
  'https://www.aidyor.app',
  'http://localhost:5173',
  'http://localhost:8080',
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

interface WhaleAlert {
  id: string;
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  network: string;
  transactionType: "buy" | "sell";
  amountUsd: number;
  timestamp: string;
  txHash?: string;
  walletAddress?: string;
}

interface DexScreenerPair {
  chainId: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  txns: {
    h1: { buys: number; sells: number };
    h24: { buys: number; sells: number };
  };
  volume: {
    h1: number;
    h24: number;
  };
  priceUsd: string;
  liquidity: { usd: number };
}

// Trending tokens to monitor for whale activity
const TRENDING_ENDPOINTS = [
  "https://api.dexscreener.com/token-boosts/latest/v1",
  "https://api.dexscreener.com/token-boosts/top/v1"
];

// Chain mapping
const chainNameMap: Record<string, string> = {
  ethereum: "Ethereum",
  bsc: "BSC",
  polygon: "Polygon",
  arbitrum: "Arbitrum",
  base: "Base",
  solana: "Solana",
  avalanche: "Avalanche",
  optimism: "Optimism",
};

// Input validation
const MIN_AMOUNT_RANGE = { min: 1000, max: 10000000 };
const LIMIT_RANGE = { min: 1, max: 100 };

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
        JSON.stringify({ error: "Unauthorized" }),
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
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[whale-alerts] Request from user: ${user.id}`);

    const body = await req.json().catch(() => ({}));
    
    // Validate and sanitize inputs
    let minAmountUsd = typeof body.minAmountUsd === 'number' ? body.minAmountUsd : 50000;
    let limit = typeof body.limit === 'number' ? body.limit : 20;
    
    // Enforce bounds
    minAmountUsd = Math.max(MIN_AMOUNT_RANGE.min, Math.min(MIN_AMOUNT_RANGE.max, minAmountUsd));
    limit = Math.max(LIMIT_RANGE.min, Math.min(LIMIT_RANGE.max, Math.floor(limit)));
    
    console.log(`[whale-alerts] Fetching with min amount: $${minAmountUsd}, limit: ${limit}`);
    
    const whaleAlerts: WhaleAlert[] = [];
    
    // Fetch trending tokens
    const trendingTokens: Array<{ chainId: string; tokenAddress: string }> = [];
    
    for (const endpoint of TRENDING_ENDPOINTS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(endpoint, {
          signal: controller.signal,
          headers: { "Accept": "application/json" }
        });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            data.slice(0, 10).forEach((item: { chainId?: string; tokenAddress?: string }) => {
              if (item.chainId && item.tokenAddress) {
                trendingTokens.push({
                  chainId: item.chainId,
                  tokenAddress: item.tokenAddress
                });
              }
            });
          }
        }
      } catch (e) {
        console.log(`[whale-alerts] Failed to fetch trending data`);
      }
    }
    
    console.log(`[whale-alerts] Found ${trendingTokens.length} trending tokens to analyze`);
    
    // Analyze each trending token for whale activity
    const tokenPromises = trendingTokens.slice(0, 15).map(async (token) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(token.tokenAddress)}`,
          {
            signal: controller.signal,
            headers: { "Accept": "application/json" }
          }
        );
        clearTimeout(timeoutId);
        
        if (!response.ok) return [];
        
        const data = await response.json();
        const pairs = data.pairs as DexScreenerPair[] | undefined;
        
        if (!pairs || pairs.length === 0) return [];
        
        const mainPair = pairs[0];
        const hourlyVolume = mainPair.volume?.h1 || 0;
        const hourlyTxns = (mainPair.txns?.h1?.buys || 0) + (mainPair.txns?.h1?.sells || 0);
        
        // Estimate average transaction size
        if (hourlyTxns > 0 && hourlyVolume > 0) {
          const avgTxSize = hourlyVolume / hourlyTxns;
          
          // If average tx size suggests whale activity (large trades)
          if (avgTxSize >= minAmountUsd * 0.5) {
            // Estimate number of whale transactions
            const estimatedWhales = Math.floor(hourlyVolume / minAmountUsd);
            
            if (estimatedWhales > 0) {
              // Determine if more buys or sells
              const buys = mainPair.txns?.h1?.buys || 0;
              const sells = mainPair.txns?.h1?.sells || 0;
              const isBuyPressure = buys > sells;
              
              const alert: WhaleAlert = {
                id: `${mainPair.baseToken.address}-${Date.now()}`,
                tokenAddress: mainPair.baseToken.address,
                tokenName: mainPair.baseToken.name,
                tokenSymbol: mainPair.baseToken.symbol,
                network: chainNameMap[mainPair.chainId] || mainPair.chainId,
                transactionType: isBuyPressure ? "buy" : "sell",
                amountUsd: Math.round(avgTxSize * estimatedWhales),
                timestamp: new Date().toISOString(),
              };
              
              return [alert];
            }
          }
        }
        
        return [];
      } catch (e) {
        console.log(`[whale-alerts] Failed to analyze token`);
        return [];
      }
    });
    
    const results = await Promise.all(tokenPromises);
    results.forEach(alerts => whaleAlerts.push(...alerts));
    
    // Sort by amount and limit
    const sortedAlerts = whaleAlerts
      .sort((a, b) => b.amountUsd - a.amountUsd)
      .slice(0, limit);
    
    console.log(`[whale-alerts] Returning ${sortedAlerts.length} whale alerts`);
    
    return new Response(
      JSON.stringify({
        alerts: sortedAlerts,
        totalFound: sortedAlerts.length,
        minAmountUsd,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("[whale-alerts] Error:", error);
    const origin = req.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
