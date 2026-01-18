import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { minAmountUsd = 50000, limit = 20 } = await req.json().catch(() => ({}));
    
    console.log(`Fetching whale alerts with min amount: $${minAmountUsd}`);
    
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
        console.log(`Failed to fetch from ${endpoint}:`, e);
      }
    }
    
    console.log(`Found ${trendingTokens.length} trending tokens to analyze`);
    
    // Analyze each trending token for whale activity
    const tokenPromises = trendingTokens.slice(0, 15).map(async (token) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${token.tokenAddress}`,
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
        console.log(`Failed to analyze token ${token.tokenAddress}:`, e);
        return [];
      }
    });
    
    const results = await Promise.all(tokenPromises);
    results.forEach(alerts => whaleAlerts.push(...alerts));
    
    // Sort by amount and limit
    const sortedAlerts = whaleAlerts
      .sort((a, b) => b.amountUsd - a.amountUsd)
      .slice(0, limit);
    
    console.log(`Returning ${sortedAlerts.length} whale alerts`);
    
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
    console.error("Whale alerts error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to fetch whale alerts" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
