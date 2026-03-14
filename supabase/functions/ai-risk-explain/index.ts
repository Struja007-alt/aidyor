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

interface RiskFactor {
  name: string;
  status: "safe" | "warning" | "danger";
  description: string;
}

interface TokenData {
  name: string;
  symbol: string;
  network: string;
  riskScore: number;
  riskFactors: RiskFactor[];
  marketData?: {
    price: number;
    liquidity: number;
    volume24h: number;
    marketCap: number;
  };
  securityData?: {
    isHoneypot: boolean;
    isVerified: boolean;
    buyTax: number;
    sellTax: number;
    holderCount: number;
    isMintable: boolean;
    hasHiddenOwner: boolean;
  };
  lockInfo?: {
    isLocked: boolean;
    lockPercentage: number;
    unlockDate: string;
  };
}

// Input validation
function validateTokenData(data: any): data is TokenData {
  if (!data || typeof data !== 'object') return false;
  if (typeof data.name !== 'string' || data.name.length > 200) return false;
  if (typeof data.symbol !== 'string' || data.symbol.length > 50) return false;
  if (typeof data.network !== 'string' || data.network.length > 50) return false;
  if (typeof data.riskScore !== 'number' || data.riskScore < 0 || data.riskScore > 100) return false;
  if (!Array.isArray(data.riskFactors) || data.riskFactors.length > 50) return false;
  return true;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
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

    console.log(`[ai-risk-explain] Request from user: ${user.id}`);

    const { tokenData } = await req.json() as { tokenData: TokenData };
    
    if (!tokenData || !tokenData.riskFactors || !validateTokenData(tokenData)) {
      return new Response(
        JSON.stringify({ error: "Invalid request format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("[ai-risk-explain] LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Service temporarily unavailable" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build context for the AI
    const dangerFactors = tokenData.riskFactors.filter(f => f.status === "danger");
    const warningFactors = tokenData.riskFactors.filter(f => f.status === "warning");
    const safeFactors = tokenData.riskFactors.filter(f => f.status === "safe");

    const riskLevel = tokenData.riskScore >= 70 ? "LOW RISK" : tokenData.riskScore >= 40 ? "MEDIUM RISK" : "HIGH RISK";

const systemPrompt = `You are AIDYOR, an expert crypto security analyst. Your job is to explain token risks in plain English.

CRITICAL RULES:
1. ONLY report issues that are explicitly listed in the data provided - NEVER invent or assume problems
2. If no dangers or warnings are detected, clearly state the token appears safe based on available data
3. Be factual and objective - do not speculate or add hypothetical risks
4. If data shows "None detected" for critical issues, acknowledge this as a positive signal

Guidelines:
- Start with the most critical finding (if any exist)
- Explain WHY each ACTUAL risk matters in practical terms
- If the token has no major issues, say so clearly and confidently
- Keep the explanation under 150 words
- Use simple language but be technically accurate
- End with a clear recommendation based ONLY on the actual data provided`;

    const userPrompt = `Analyze this token and explain the risks:

**Token:** ${tokenData.name} (${tokenData.symbol}) on ${tokenData.network}
**Risk Score:** ${tokenData.riskScore}/100 (${riskLevel})

**Critical Issues (${dangerFactors.length}):**
${dangerFactors.length > 0 
  ? dangerFactors.map(f => `- ${f.name}: ${f.description}`).join("\n")
  : "- None detected"}

**Warnings (${warningFactors.length}):**
${warningFactors.length > 0
  ? warningFactors.map(f => `- ${f.name}: ${f.description}`).join("\n")
  : "- None detected"}

**Positive Signals (${safeFactors.length}):**
${safeFactors.length > 0
  ? safeFactors.map(f => `- ${f.name}: ${f.description}`).join("\n")
  : "- None detected"}

**Market Data:**
- Liquidity: $${tokenData.marketData?.liquidity?.toLocaleString() || "Unknown"}
- 24h Volume: $${tokenData.marketData?.volume24h?.toLocaleString() || "Unknown"}
- Holders: ${tokenData.securityData?.holderCount?.toLocaleString() || "Unknown"}

**Additional Info:**
- Contract Verified: ${tokenData.securityData?.isVerified ? "Yes" : "No/Unknown"}
- Honeypot: ${tokenData.securityData?.isHoneypot ? "YES - CRITICAL" : "No"}
- Buy Tax: ${tokenData.securityData?.buyTax ? (tokenData.securityData.buyTax * 100).toFixed(1) + "%" : "Unknown"}
- Sell Tax: ${tokenData.securityData?.sellTax ? (tokenData.securityData.sellTax * 100).toFixed(1) + "%" : "Unknown"}
- Liquidity Locked: ${tokenData.lockInfo?.isLocked ? `Yes (${tokenData.lockInfo.lockPercentage}%)` : "No/Unknown"}

Provide a clear, actionable explanation of the risks.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 500,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      console.error(`[ai-risk-explain] AI gateway error: ${status}`);
      
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable." }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Service temporarily unavailable" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const explanation = data.choices?.[0]?.message?.content;

    if (!explanation) {
      console.error("[ai-risk-explain] No explanation generated");
      return new Response(
        JSON.stringify({ error: "Failed to generate explanation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[ai-risk-explain] Explanation generated successfully");

    return new Response(
      JSON.stringify({ 
        explanation,
        riskLevel,
        dangerCount: dangerFactors.length,
        warningCount: warningFactors.length,
        safeCount: safeFactors.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[ai-risk-explain] Error:", error);
    const origin = req.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
