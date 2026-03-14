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
  // Allow all lovableproject.com and lovable.app subdomains for previews
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

// Rate limiting config
const FREE_REQUESTS_PER_HOUR = 5;
const WHALE_PRO_PRICE_CENTS = 4900; // $49.00

// In-memory rate limiter (resets on function cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const hourMs = 60 * 60 * 1000;
  
  const entry = rateLimitMap.get(identifier);
  
  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + hourMs });
    return { allowed: true, remaining: FREE_REQUESTS_PER_HOUR - 1, resetIn: hourMs };
  }
  
  if (entry.count >= FREE_REQUESTS_PER_HOUR) {
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
  }
  
  entry.count++;
  return { allowed: true, remaining: FREE_REQUESTS_PER_HOUR - entry.count, resetIn: entry.resetAt - now };
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

async function checkWhaleProSubscription(supabase: any, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('whale_subscriptions')
      .select('status, expires_at')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();
    
    if (error || !data) return false;
    
    // Check if subscription is still valid
    const expiresAt = (data as { status: string; expires_at: string | null }).expires_at;
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[whale-alerts] Processing request...");

    const body = await req.json().catch(() => ({}));
    
    // Validate and sanitize inputs
    let minAmountUsd = typeof body.minAmountUsd === 'number' ? body.minAmountUsd : 50000;
    let limit = typeof body.limit === 'number' ? body.limit : 20;
    
    // Enforce bounds
    minAmountUsd = Math.max(MIN_AMOUNT_RANGE.min, Math.min(MIN_AMOUNT_RANGE.max, minAmountUsd));
    limit = Math.max(LIMIT_RANGE.min, Math.min(LIMIT_RANGE.max, Math.floor(limit)));
    
    // Check authentication and subscription status
    const authHeader = req.headers.get('Authorization');
    let isWhalePro = false;
    let userId: string | null = null;
    let rateLimitIdentifier: string;
    
    if (authHeader?.startsWith('Bearer ')) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );
      
      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
      
      if (!claimsError && claimsData?.claims?.sub) {
        userId = claimsData.claims.sub as string;
        rateLimitIdentifier = `user:${userId}`;
        
        // Check Whale Pro subscription using service role
        const serviceSupabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        isWhalePro = await checkWhaleProSubscription(serviceSupabase, userId);
        console.log(`[whale-alerts] User ${userId} - Whale Pro: ${isWhalePro}`);
      } else {
        // Invalid token, use IP-based rate limiting
        rateLimitIdentifier = `ip:${req.headers.get('x-forwarded-for') || 'unknown'}`;
      }
    } else {
      // No auth, use IP-based rate limiting
      rateLimitIdentifier = `ip:${req.headers.get('x-forwarded-for') || 'unknown'}`;
    }
    
    // Apply rate limiting for non-Whale Pro users
    if (!isWhalePro) {
      const rateLimit = checkRateLimit(rateLimitIdentifier);
      
      if (!rateLimit.allowed) {
        console.log(`[whale-alerts] Rate limited: ${rateLimitIdentifier}`);
        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded",
            message: "Free users are limited to 5 whale alert requests per hour. Upgrade to Whale Pro ($49/month) for unlimited access.",
            resetIn: Math.ceil(rateLimit.resetIn / 1000 / 60), // minutes
            upgradeUrl: "/api-docs#whale-pro",
          }),
          { 
            status: 429, 
            headers: { 
              ...corsHeaders, 
              "Content-Type": "application/json",
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(Math.ceil(rateLimit.resetIn / 1000)),
            } 
          }
        );
      }
      
      // Add rate limit headers for free users
      corsHeaders["X-RateLimit-Remaining"] = String(rateLimit.remaining);
      corsHeaders["X-RateLimit-Reset"] = String(Math.ceil(rateLimit.resetIn / 1000));
      corsHeaders["X-RateLimit-Limit"] = String(FREE_REQUESTS_PER_HOUR);
    } else {
      // Whale Pro users get unlimited header
      corsHeaders["X-RateLimit-Limit"] = "unlimited";
    }
    
    console.log(`[whale-alerts] Fetching with min amount: $${minAmountUsd}, limit: ${limit}, isWhalePro: ${isWhalePro}`);
    
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
        subscription: isWhalePro ? "whale_pro" : "free",
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
