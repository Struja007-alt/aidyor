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

interface OrchestratorRequest {
  address: string;
  network?: string;
  includeAI?: boolean;
}

interface OrchestratorResponse {
  success: boolean;
  data?: {
    token: {
      name: string;
      symbol: string;
      address: string;
      network: string;
      imageUrl?: string;
    };
    riskAssessment: {
      overallScore: number;
      riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      confidence: number;
      trend: "IMPROVING" | "STABLE" | "WORSENING";
    };
    marketData: {
      price: number;
      liquidity: number;
      volume24h: number;
      change24h: number;
      marketCap: number;
      chainsFound: string[];
    };
    securityData: {
      isHoneypot: boolean;
      isVerified: boolean;
      buyTax: number;
      sellTax: number;
      holderCount: number;
      isMintable: boolean;
      lockInfo: {
        isLocked: boolean;
        lockPercentage: number;
        unlockDate: string | null;
      } | null;
    };
    simulation: {
      pumpDumpStatus: string;
      confidence: number;
      recommendation: string;
    };
    aiExplanation?: {
      explanation: string;
      keyTakeaways: string[];
      recommendation: string;
    };
    riskFactors: { name: string; status: "safe" | "warning" | "danger"; description: string }[];
    sources: string[];
  };
  error?: string;
  processingTime: number;
  timestamp: string;
}

// Address validation patterns
const ADDRESS_PATTERNS = {
  evm: /^0x[a-fA-F0-9]{40}$/,
  solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
};

function validateAddress(address: string): boolean {
  if (!address || typeof address !== 'string' || address.length > 100) return false;
  return ADDRESS_PATTERNS.evm.test(address) || ADDRESS_PATTERNS.solana.test(address);
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

async function callService<T>(serviceName: string, body: any, authHeader: string): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${serviceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
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
  } catch (error) {
    clearTimeout(timeout);
    console.error(`[Orchestrator] ${serviceName} error`);
    return null;
  }
}

function calculateOverallRisk(
  marketScore: number,
  securityScore: number,
  simulationStatus: string
): { overallScore: number; riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; confidence: number; trend: "IMPROVING" | "STABLE" | "WORSENING" } {
  // Weighted average: 45% security, 40% market, 15% simulation penalty
  let baseScore = securityScore * 0.45 + marketScore * 0.40;
  
  // Simulation adjustments
  let simulationPenalty = 0;
  let trend: "IMPROVING" | "STABLE" | "WORSENING" = "STABLE";
  
  if (simulationStatus === "dump") {
    simulationPenalty = 20;
    trend = "WORSENING";
  } else if (simulationStatus === "pump") {
    simulationPenalty = 10; // Pumps are risky too
    trend = "WORSENING";
  } else if (simulationStatus === "unusual") {
    simulationPenalty = 5;
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(baseScore - simulationPenalty)));
  
  let level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  if (finalScore >= 70) level = "LOW";
  else if (finalScore >= 40) level = "MEDIUM";
  else if (finalScore >= 20) level = "HIGH";
  else level = "CRITICAL";

  // Confidence based on data availability
  const confidence = Math.min(0.95, 0.5 + (marketScore > 0 ? 0.2 : 0) + (securityScore > 0 ? 0.2 : 0));

  return { overallScore: finalScore, riskLevel: level, confidence, trend };
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Unauthorized", 
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString() 
        }),
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
        JSON.stringify({ 
          success: false, 
          error: "Unauthorized", 
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString() 
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Orchestrator] Request from user: ${user.id}`);

    const { address, network, includeAI = false }: OrchestratorRequest = await req.json();

    if (!address || !validateAddress(address)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid address format", 
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString() 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedAddress = address.toLowerCase().trim();
    console.log(`[Orchestrator] Starting analysis for: ${normalizedAddress}${network ? ` on ${network}` : ""}`);

    // Step 1: Fetch market data first (needed for other services)
    const marketResult = await callService<any>("market-data-service", { address: normalizedAddress, network }, authHeader);

    if (!marketResult?.data) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Token not found on any DEX", 
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString() 
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const bestPair = marketResult.data.summary.bestPair;
    const detectedNetwork = network || bestPair?.chainId || "unknown";

    // Step 2: Parallel fetch security data and run simulation
    const [securityResult, simulationResult] = await Promise.all([
      callService<any>("onchain-data-service", { address: normalizedAddress, network: detectedNetwork }, authHeader),
      callService<any>("simulation-engine", {
        address: normalizedAddress,
        network: detectedNetwork,
        marketData: {
          price: parseFloat(bestPair?.priceUsd) || 0,
          liquidity: marketResult.data.summary.totalLiquidity,
          volume24h: marketResult.data.summary.totalVolume24h,
          change24h: bestPair?.priceChange?.h24 || 0,
          txns24h: bestPair?.txns?.h24,
        },
      }, authHeader),
    ]);

    // Aggregate risk factors
    const allFactors: { name: string; status: "safe" | "warning" | "danger"; description: string }[] = [];
    const sources: string[] = ["dexscreener"];

    if (marketResult.data.riskMetrics?.factors) {
      allFactors.push(...marketResult.data.riskMetrics.factors);
    }

    if (securityResult?.data?.factors) {
      allFactors.push(...securityResult.data.factors);
      sources.push(...securityResult.data.sources);
    }

    // Calculate overall risk
    const marketScore = marketResult.data.riskMetrics?.overallScore || 50;
    const securityScore = securityResult?.data?.riskScore || 50;
    const simulationStatus = simulationResult?.data?.pumpDumpStatus || "normal";
    
    const riskAssessment = calculateOverallRisk(marketScore, securityScore, simulationStatus);

    // Build response
    const response: OrchestratorResponse = {
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
          price: parseFloat(bestPair?.priceUsd) || 0,
          liquidity: marketResult.data.summary.totalLiquidity,
          volume24h: marketResult.data.summary.totalVolume24h,
          change24h: bestPair?.priceChange?.h24 || 0,
          marketCap: bestPair?.marketCap || bestPair?.fdv || 0,
          chainsFound: marketResult.data.summary.chainsFound,
        },
        securityData: {
          isHoneypot: securityResult?.data?.security?.isHoneypot || false,
          isVerified: securityResult?.data?.security?.isVerified || false,
          buyTax: securityResult?.data?.security?.buyTax || 0,
          sellTax: securityResult?.data?.security?.sellTax || 0,
          holderCount: securityResult?.data?.security?.holderCount || 0,
          isMintable: securityResult?.data?.security?.isMintable || false,
          lockInfo: securityResult?.data?.lockInfo || null,
        },
        simulation: {
          pumpDumpStatus: simulationStatus,
          confidence: simulationResult?.data?.confidence || 0.5,
          recommendation: simulationResult?.data?.prediction?.recommendation || "Standard due diligence recommended.",
        },
        riskFactors: allFactors,
        sources,
      },
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };

    // Step 3: Optional AI explanation
    if (includeAI && response.data) {
      console.log("[Orchestrator] Fetching AI explanation...");
      const aiResult = await callService<any>("ai-risk-engine", {
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
      }, authHeader);

      if (aiResult?.data) {
        response.data.aiExplanation = {
          explanation: aiResult.data.explanation,
          keyTakeaways: aiResult.data.keyTakeaways,
          recommendation: aiResult.data.recommendation,
        };
        sources.push("ai-engine");
      }
    }

    console.log(`[Orchestrator] Complete: score=${riskAssessment.overallScore}, level=${riskAssessment.riskLevel}, time=${Date.now() - startTime}ms`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Orchestrator] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "An error occurred processing your request",
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
