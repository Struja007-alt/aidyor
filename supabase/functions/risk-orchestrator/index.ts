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

const ADDRESS_PATTERNS = {
  evm: /^0x[a-fA-F0-9]{40}$/,
  solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
};

function validateAddress(address) {
  if (!address || typeof address !== 'string' || address.length > 100) return false;
  const a = address.trim();
  return ADDRESS_PATTERNS.evm.test(a) || ADDRESS_PATTERNS.solana.test(a);
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";

async function callService(serviceName, body, authHeader) {
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
  } catch (error) {
    clearTimeout(timeout);
    console.error(`[Orchestrator] ${serviceName} error`);
    return null;
  }
}

// Returns a clamped 0-100 number, or null if missing/invalid.
// IMPORTANT: 0 is a valid score (worst) and must NOT be treated as missing.
function asScore(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, value));
}

// Flags can arrive as true, 1, "1", or "true".
function isTruthyFlag(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}

// Used only when a score is missing. Pessimistic on purpose.
const MISSING_SCORE_FALLBACK = 40;

function calculateOverallRisk(marketScore, securityScore, simulationStatus, ctx) {
  const marketKnown = marketScore !== null;
  const securityKnown = securityScore !== null && ctx.securityAvailable;

  const m = marketKnown ? marketScore : MISSING_SCORE_FALLBACK;
  const s = securityKnown ? securityScore : MISSING_SCORE_FALLBACK;

  // 45% security + 40% market (max 85), minus simulation penalty
  const baseScore = s * 0.45 + m * 0.40;

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
  const caps = [];
  if (ctx.isHoneypot) caps.push({ max: 5, reason: "Honeypot detected" });
  if (ctx.dangerCount >= 3) caps.push({ max: 30, reason: "Multiple critical risk factors" });
  else if (ctx.dangerCount === 2) caps.push({ max: 49, reason: "Two critical risk factors" });
  if (!securityKnown) caps.push({ max: 60, reason: "Security data unavailable" });
  else if (ctx.securityPartial) caps.push({ max: 60, reason: "Security data incomplete" });
  if (!marketKnown) caps.push({ max: 60, reason: "Market data unavailable" });
  if (ctx.honeypotUnknown) caps.push({ max: 69, reason: "Honeypot check incomplete" });
  // Market-level hard caps (new pair, buys with no sells, tiny liquidity)
  for (const c of ctx.marketHardCaps || []) {
    if (c && typeof c.max === "number") caps.push({ max: c.max, reason: c.reason });
  }

  let finalScore = uncapped;
  const capReasons = caps.filter((c) => uncapped > c.max).map((c) => c.reason);
  for (const c of caps) {
    if (finalScore > c.max) finalScore = c.max;
  }

  let level;
  if (finalScore >= 70) level = "LOW";
  else if (finalScore >= 40) level = "MEDIUM";
  else if (finalScore >= 20) level = "HIGH";
  else level = "CRITICAL";

  // Confidence reflects which data sources actually responded
  const confidence = Math.min(
    0.95,
    0.4 +
      (marketKnown ? 0.2 : 0) +
      (securityKnown && !ctx.securityPartial ? 0.25 : 0) +
      (ctx.simulationAvailable ? 0.1 : 0)
  );

  const dataComplete =
    marketKnown && securityKnown && !ctx.securityPartial && ctx.simulationAvailable && !ctx.honeypotUnknown;

  return { overallScore: finalScore, riskLevel: level, confidence, trend, dataComplete, capReasons };
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized", processingTime: Date.now() - startTime, timestamp: new Date().toISOString() }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'));

    // NOTE (Aug 13 2026 fix): an unresolved token is treated as an anonymous
    // visitor instead of being rejected. check-scan-limit gates anonymous usage by IP.
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    console.log(`[Orchestrator] Request from ${user ? `user: ${user.id}` : 'anonymous visitor'}`);

    const { address, network, includeAI = false } = await req.json();

    if (!address || !validateAddress(address)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid address format", processingTime: Date.now() - startTime, timestamp: new Date().toISOString() }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // EVM addresses are case-insensitive; Solana (base58) is case-SENSITIVE
    // and must not be lowercased or downstream lookups fail.
    const trimmedAddress = address.trim();
    const normalizedAddress = ADDRESS_PATTERNS.evm.test(trimmedAddress) ? trimmedAddress.toLowerCase() : trimmedAddress;
    console.log(`[Orchestrator] Starting analysis for: ${normalizedAddress}${network ? ` on ${network}` : ""}`);

    const marketResult = await callService("market-data-service", { address: normalizedAddress, network }, authHeader);

    if (!marketResult?.data) {
      return new Response(JSON.stringify({ success: false, error: "Token not found on any DEX", processingTime: Date.now() - startTime, timestamp: new Date().toISOString() }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const bestPair = marketResult.data.summary.bestPair;
    const detectedNetwork = network || bestPair?.chainId || "unknown";

    const [securityResult, simulationResult] = await Promise.all([
      callService("onchain-data-service", { address: normalizedAddress, network: detectedNetwork }, authHeader),
      callService("simulation-engine", {
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

    const allFactors = [];
    const sources = ["dexscreener"];

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
        description: "Security scan unavailable. Score is capped and incomplete - do not treat as safe.",
      });
    }

    // Strict parsing: a score of 0 stays 0 (it used to become 50 via `|| 50`)
    const marketScore = asScore(marketResult.data.riskMetrics?.overallScore);
    const securityScore = asScore(securityResult?.data?.riskScore);
    const simulationStatus = simulationResult?.data?.pumpDumpStatus || "normal";

    const security = securityResult?.data?.security;
    const isHoneypot = isTruthyFlag(security?.isHoneypot);
    const honeypotUnknown = securityAvailable && security?.honeypotUnknown === true;
    const dangerCount = allFactors.filter((f) => f.status === "danger").length;

    const riskAssessment = calculateOverallRisk(marketScore, securityScore, simulationStatus, {
      isHoneypot,
      honeypotUnknown,
      dangerCount,
      securityAvailable,
      securityPartial,
      simulationAvailable,
      marketHardCaps: marketResult.data.riskMetrics?.hardCaps,
    });

    const response = {
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
          available: securityAvailable,
          honeypotUnknown,
          isHoneypot,
          isVerified: isTruthyFlag(security?.isVerified),
          buyTax: security?.buyTax || 0,
          sellTax: security?.sellTax || 0,
          holderCount: security?.holderCount || 0,
          isMintable: isTruthyFlag(security?.isMintable),
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

    if (includeAI && response.data) {
      console.log("[Orchestrator] Fetching AI explanation...");
      const aiResult = await callService("ai-risk-engine", {
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

    console.log(`[Orchestrator] Complete: score=${riskAssessment.overallScore}, level=${riskAssessment.riskLevel}, complete=${riskAssessment.dataComplete}, time=${Date.now() - startTime}ms`);

    return new Response(JSON.stringify(response), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[Orchestrator] Error:", error);
    return new Response(JSON.stringify({ success: false, error: "An error occurred processing your request", processingTime: Date.now() - startTime, timestamp: new Date().toISOString() }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
