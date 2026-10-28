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
      dataComplete: boolean;
      capReasons: string[];
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
    riskFactors: {
      name: string;
      status: "safe" | "warning" | "danger";
      description: string;
    }[];
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
  if (!address || typeof address !== "string" || address.length > 100) {
    return false;
  }
  return (
    ADDRESS_PATTERNS.evm.test(address) ||
    ADDRESS_PATTERNS.solana.test(address)
  );
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

async function callService<T>(
  serviceName: string,
  body: any,
  authHeader: string
): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/${serviceName}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(
        `[Orchestrator] ${serviceName} returned ${response.status}`
      );
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

// ---------------------------------------------------------------------------
// Helpers: strict parsing so missing/odd data is never silently treated as safe
// ---------------------------------------------------------------------------

// Returns a clamped 0-100 number, or null if the value is missing/invalid.
// IMPORTANT: 0 is a valid score (worst) and must NOT be treated as missing.
function asScore(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, value));
}

// GoPlus-style flags can arrive as true, 1, "1", or "true".
function isTruthyFlag(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

// Fallback used only when a score is missing. Pessimistic on purpose.
const MISSING_SCORE_FALLBACK = 40;

interface RiskContext {
  isHoneypot: boolean;
  isMintable: boolean;
  isUnverified: boolean;
  dangerCount: number;
  securityAvailable: boolean;
  simulationAvailable: boolean;
}

function calculateOverallRisk(
  marketScore: number | null,
  securityScore: number | null,
  simulationStatus: string,
  ctx: RiskContext
): {
  overallScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence: number;
  trend: "IMPROVING" | "STABLE" | "WORSENING";
  dataComplete: boolean;
  capReasons: string[];
} {
  const marketKnown = marketScore !== null;
  const securityKnown = securityScore !== null && ctx.securityAvailable;

  const m = marketScore ?? MISSING_SCORE_FALLBACK;
  const s = securityKnown ? (securityScore as number) : MISSING_SCORE_FALLBACK;

  // Weighted average: 45% security, 40% market (max 85), minus simulation penalty
  const baseScore = s * 0.45 + m * 0.4;

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

  let finalScore = Math.max(
    0,
    Math.min(100, Math.round(baseScore - simulationPenalty))
  );

  // Hard caps: certain findings override the average.
  // LOW starts at 70, so any cap below 70 means the token can never be LOW.
  const caps: { max: number; reason: string }[] = [];

  if (ctx.isHoneypot) {
    caps.push({ max: 5, reason: "Honeypot detected" });
  }
  if (ctx.dangerCount >= 2) {
    caps.push({ max: 30, reason: "Multiple critical risk factors" });
  } else if (ctx.dangerCount === 1) {
    caps.push({ max: 49, reason: "Critical risk factor present" });
  }
  if (!securityKnown) {
    caps.push({ max: 60, reason: "Security data unavailable" });
  }
  if (ctx.isUnverified) {
    caps.push({ max: 59, reason: "Contract not verified" });
  }
  if (ctx.isMintable) {
    caps.push({ max: 69, reason: "Mintable supply" });
  }

  const capReasons: string[] = [];
  for (const cap of caps) {
    if (finalScore > cap.max) {
      finalScore = cap.max;
    }
  }
  // Report every cap that is binding at the final score
  for (const cap of caps) {
    if (finalScore <= cap.max) capReasons.push(cap.reason);
  }

  let level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  if (finalScore >= 70) level = "LOW";
  else if (finalScore >= 40) level = "MEDIUM";
  else if (finalScore >= 20) level = "HIGH";
  else level = "CRITICAL";

  // Confidence reflects which data sources actually responded
  const confidence = Math.min(
    0.95,
    0.4 +
      (marketKnown ? 0.2 : 0) +
      (securityKnown ? 0.25 : 0) +
      (ctx.simulationAvailable ? 0.1 : 0)
  );

  return {
    overallScore: finalScore,
    riskLevel: level,
    confidence,
    trend,
    dataComplete: marketKnown && securityKnown && ctx.simulationAvailable,
    capReasons,
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Unauthorized",
          processingTime: Date.now() - startTime,
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

    const token = authHeader.replace("Bearer ", "");

    // Guest path: the browser extension (and any other unauthenticated
    // client) sends a public key instead of a logged-in user's JWT.
    // Treat that as an anonymous scan rather than rejecting it, mirroring
    // the free client-side scanner's access level. Accept either the
    // legacy JWT-format anon key (SUPABASE_ANON_KEY env var) or the newer
    // sb_publishable_ key format - both are safe to expose publicly, so
    // either one is sufficient proof this is a legitimate client, not a
    // proof of identity.
    const isGuestRequest =
      (SUPABASE_ANON_KEY !== "" && token === SUPABASE_ANON_KEY) ||
      token.startsWith("sb_publishable_");

    let userId = "anonymous-extension";

    if (!isGuestRequest) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!
      );

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser(token);

      if (userError || !user) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Unauthorized",
            processingTime: Date.now() - startTime,
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

      userId = user.id;
    }

    console.log(`[Orchestrator] Request from user: ${userId}`);

    const {
      address,
      network,
      includeAI = false,
    }: OrchestratorRequest = await req.json();

    if (!address || !validateAddress(address)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid address format",
          processingTime: Date.now() - startTime,
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

    const normalizedAddress = address.toLowerCase().trim();
    console.log(
      `[Orchestrator] Starting analysis for: ${normalizedAddress}${
        network ? ` on ${network}` : ""
      }`
    );

    // Step 1: Fetch market data first (needed for other services)
    const marketResult = await callService<any>(
      "market-data-service",
      {
        address: normalizedAddress,
        network,
      },
      authHeader
    );

    if (!marketResult?.data) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Token not found on any DEX",
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const bestPair = marketResult.data.summary.bestPair;
    const detectedNetwork = network || bestPair?.chainId || "unknown";

    // Step 2: Parallel fetch security data and run simulation
    const [securityResult, simulationResult] = await Promise.all([
      callService<any>(
        "onchain-data-service",
        {
          address: normalizedAddress,
          network: detectedNetwork,
        },
        authHeader
      ),
      callService<any>(
        "simulation-engine",
        {
          address: normalizedAddress,
          network: detectedNetwork,
          marketData: {
            price: parseFloat(bestPair?.priceUsd) || 0,
            liquidity: marketResult.data.summary.totalLiquidity,
            volume24h: marketResult.data.summary.totalVolume24h,
            change24h: bestPair?.priceChange?.h24 || 0,
            txns24h: bestPair?.txns?.h24,
          },
        },
        authHeader
      ),
    ]);

    // Aggregate risk factors
    const allFactors: {
      name: string;
      status: "safe" | "warning" | "danger";
      description: string;
    }[] = [];
    const sources: string[] = ["dexscreener"];

    if (Array.isArray(marketResult.data.riskMetrics?.factors)) {
      allFactors.push(...marketResult.data.riskMetrics.factors);
    }

    const securityAvailable = !!securityResult?.data;
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
        name: "Security data",
        status: "warning",
        description:
          "Security scan unavailable. Score is capped and incomplete - do not treat as safe.",
      });
    }

    // Parse inputs strictly (0 is a valid score, not "missing")
    const marketScore = asScore(marketResult.data.riskMetrics?.overallScore);
    const securityScore = asScore(securityResult?.data?.riskScore);
    const simulationStatus: string =
      simulationResult?.data?.pumpDumpStatus || "normal";

    const security = securityResult?.data?.security;
    const isHoneypot = isTruthyFlag(security?.isHoneypot);
    const isMintable = isTruthyFlag(security?.isMintable);
    const isSolana = String(detectedNetwork).toLowerCase() === "solana";
    const isUnverified =
      securityAvailable &&
      !isSolana &&
      security?.isVerified !== undefined &&
      security?.isVerified !== null &&
      !isTruthyFlag(security.isVerified);
    const dangerCount = allFactors.filter((f) => f.status === "danger").length;

    const riskAssessment = calculateOverallRisk(
      marketScore,
      securityScore,
      simulationStatus,
      {
        isHoneypot,
        isMintable,
        isUnverified,
        dangerCount,
        securityAvailable,
        simulationAvailable,
      }
    );

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
          isHoneypot,
          isVerified: isTruthyFlag(security?.isVerified),
          buyTax: security?.buyTax || 0,
          sellTax: security?.sellTax || 0,
          holderCount: security?.holderCount || 0,
          isMintable,
          lockInfo: securityResult?.data?.lockInfo || null,
        },
        simulation: {
          pumpDumpStatus: simulationStatus,
          confidence: simulationResult?.data?.confidence || 0.5,
          recommendation:
            simulationResult?.data?.prediction?.recommendation ||
            "Standard due diligence recommended.",
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

      const aiResult = await callService<any>(
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
      `[Orchestrator] Complete: score=${riskAssessment.overallScore}, level=${riskAssessment.riskLevel}, complete=${riskAssessment.dataComplete}, time=${Date.now() - startTime}ms`
    );

    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
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
