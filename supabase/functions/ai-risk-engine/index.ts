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

interface RiskFactor {
  name: string;
  status: "safe" | "warning" | "danger";
  description: string;
}

interface AIRiskRequest {
  tokenData: {
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
    pumpDumpStatus?: string;
  };
}

interface AIRiskResponse {
  success: boolean;
  data?: {
    explanation: string;
    riskLevel: string;
    dangerCount: number;
    warningCount: number;
    safeCount: number;
    keyTakeaways: string[];
    recommendation: "avoid" | "caution" | "acceptable" | "low_risk";
  };
  error?: string;
  timestamp: string;
}

// Input validation
function validateTokenData(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  if (typeof data.name !== 'string' || data.name.length > 200) return false;
  if (typeof data.symbol !== 'string' || data.symbol.length > 50) return false;
  if (typeof data.network !== 'string' || data.network.length > 50) return false;
  if (typeof data.riskScore !== 'number' || data.riskScore < 0 || data.riskScore > 100) return false;
  if (!Array.isArray(data.riskFactors) || data.riskFactors.length > 50) return false;
  return true;
}

function buildPrompt(tokenData: AIRiskRequest["tokenData"]): string {
  const { name, symbol, network, riskScore, riskFactors, marketData, securityData, lockInfo, pumpDumpStatus } = tokenData;

  const dangerFactors = riskFactors.filter(f => f.status === "danger");
  const warningFactors = riskFactors.filter(f => f.status === "warning");
  const safeFactors = riskFactors.filter(f => f.status === "safe");

  let context = `Token: ${name} (${symbol}) on ${network}\n`;
  context += `Safety Score: ${riskScore}/100\n\n`;

  if (marketData) {
    context += "Market Data:\n";
    context += `- Price: $${marketData.price}\n`;
    context += `- Liquidity: $${marketData.liquidity.toLocaleString()}\n`;
    context += `- 24h Volume: $${marketData.volume24h.toLocaleString()}\n`;
    if (marketData.marketCap) context += `- Market Cap: $${marketData.marketCap.toLocaleString()}\n`;
    context += "\n";
  }

  if (securityData) {
    context += "Security Analysis:\n";
    if (securityData.isHoneypot) context += "- ⚠️ HONEYPOT DETECTED\n";
    context += `- Contract Verified: ${securityData.isVerified ? "Yes" : "No"}\n`;
    if (securityData.buyTax > 0 || securityData.sellTax > 0) {
      context += `- Buy Tax: ${securityData.buyTax}%, Sell Tax: ${securityData.sellTax}%\n`;
    }
    context += `- Holders: ${securityData.holderCount.toLocaleString()}\n`;
    if (securityData.isMintable) context += "- ⚠️ Token is mintable\n";
    if (securityData.hasHiddenOwner) context += "- ⚠️ Hidden owner detected\n";
    context += "\n";
  }

  if (lockInfo) {
    context += "Liquidity Lock:\n";
    context += `- Locked: ${lockInfo.isLocked ? "Yes" : "No"}\n`;
    if (lockInfo.isLocked) {
      context += `- Lock Percentage: ${lockInfo.lockPercentage}%\n`;
      context += `- Unlock Date: ${lockInfo.unlockDate}\n`;
    }
    context += "\n";
  }

  if (pumpDumpStatus && pumpDumpStatus !== "normal") {
    context += `Trading Pattern: ${pumpDumpStatus.toUpperCase()} detected\n\n`;
  }

  if (dangerFactors.length > 0) {
    context += "🚨 DANGER Factors:\n";
    dangerFactors.forEach(f => {
      context += `- ${f.name}: ${f.description}\n`;
    });
    context += "\n";
  }

  if (warningFactors.length > 0) {
    context += "⚠️ WARNING Factors:\n";
    warningFactors.forEach(f => {
      context += `- ${f.name}: ${f.description}\n`;
    });
    context += "\n";
  }

  if (safeFactors.length > 0) {
    context += "✅ SAFE Factors:\n";
    safeFactors.forEach(f => {
      context += `- ${f.name}: ${f.description}\n`;
    });
  }

  return context;
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

    console.log(`[AI Risk Engine] Request from user: ${user.id}`);

    const { tokenData }: AIRiskRequest = await req.json();

    if (!tokenData || !validateTokenData(tokenData)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid request format", timestamp: new Date().toISOString() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[AI Risk Engine] Analyzing: ${tokenData.name} (${tokenData.symbol})`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("[AI Risk Engine] LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Service temporarily unavailable", timestamp: new Date().toISOString() }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = buildPrompt(tokenData);

    const systemPrompt = `You are a crypto security analyst providing clear, factual risk assessments.

RULES:
1. Only analyze the data provided - never assume or invent information
2. Be direct and concise - traders need quick insights
3. Prioritize critical risks (honeypots, high taxes, mintable supply)
4. Explain WHY each risk matters in practical terms
5. End with a clear recommendation

FORMAT:
- Start with the most critical finding
- Use bullet points for clarity
- Keep response under 200 words
- End with: "Recommendation: [AVOID/CAUTION/ACCEPTABLE/LOW RISK]"`;

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
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      console.error(`[AI Risk Engine] AI gateway error: ${status}`);
      
      if (status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Too many requests. Please try again later.", timestamp: new Date().toISOString() }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "Service temporarily unavailable.", timestamp: new Date().toISOString() }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ success: false, error: "Service temporarily unavailable", timestamp: new Date().toISOString() }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const explanation = aiResponse.choices?.[0]?.message?.content || "Unable to generate analysis.";

    // Parse counts from risk factors
    const dangerCount = tokenData.riskFactors.filter(f => f.status === "danger").length;
    const warningCount = tokenData.riskFactors.filter(f => f.status === "warning").length;
    const safeCount = tokenData.riskFactors.filter(f => f.status === "safe").length;

    // Determine recommendation from explanation
    let recommendation: "avoid" | "caution" | "acceptable" | "low_risk" = "caution";
    const lowerExplanation = explanation.toLowerCase();
    if (lowerExplanation.includes("avoid") || tokenData.securityData?.isHoneypot) {
      recommendation = "avoid";
    } else if (lowerExplanation.includes("low risk") || tokenData.riskScore >= 70) {
      recommendation = "low_risk";
    } else if (lowerExplanation.includes("acceptable")) {
      recommendation = "acceptable";
    }

    // Extract key takeaways (simple heuristic)
    const keyTakeaways: string[] = [];
    if (tokenData.securityData?.isHoneypot) keyTakeaways.push("Honeypot detected - cannot sell");
    if (dangerCount > 0) keyTakeaways.push(`${dangerCount} critical risk(s) found`);
    if (tokenData.lockInfo?.isLocked) keyTakeaways.push(`Liquidity locked (${tokenData.lockInfo.lockPercentage}%)`);
    if (tokenData.marketData?.liquidity && tokenData.marketData.liquidity >= 100000) {
      keyTakeaways.push("Strong liquidity");
    }

    const result: AIRiskResponse = {
      success: true,
      data: {
        explanation,
        riskLevel: tokenData.riskScore >= 70 ? "LOW" : tokenData.riskScore >= 40 ? "MEDIUM" : "HIGH",
        dangerCount,
        warningCount,
        safeCount,
        keyTakeaways,
        recommendation,
      },
      timestamp: new Date().toISOString(),
    };

    console.log(`[AI Risk Engine] Generated explanation, recommendation: ${recommendation}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[AI Risk Engine] Error:", error);
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
