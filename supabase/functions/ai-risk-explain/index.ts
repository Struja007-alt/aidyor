import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tokenData } = await req.json() as { tokenData: TokenData };
    
    if (!tokenData || !tokenData.riskFactors) {
      return new Response(
        JSON.stringify({ error: "Token data with risk factors is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context for the AI
    const dangerFactors = tokenData.riskFactors.filter(f => f.status === "danger");
    const warningFactors = tokenData.riskFactors.filter(f => f.status === "warning");
    const safeFactors = tokenData.riskFactors.filter(f => f.status === "safe");

    const riskLevel = tokenData.riskScore >= 70 ? "LOW RISK" : tokenData.riskScore >= 40 ? "MEDIUM RISK" : "HIGH RISK";

    const systemPrompt = `You are AIDYOR, an expert crypto security analyst. Your job is to explain token risks in plain English that both beginners and experienced traders can understand.

Be direct, specific, and actionable. Use the actual data provided. Never make up information.

Guidelines:
- Start with the most critical finding
- Explain WHY each risk matters in practical terms (e.g., "This means you might not be able to sell")
- If there are positive signals, acknowledge them but don't downplay real risks
- Keep the explanation under 150 words
- Use simple language but be technically accurate
- End with a clear recommendation (proceed with caution / avoid / looks reasonable)`;

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

    console.log("Calling Lovable AI for risk explanation...");

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
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const explanation = data.choices?.[0]?.message?.content;

    if (!explanation) {
      throw new Error("No explanation generated");
    }

    console.log("AI explanation generated successfully");

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
    console.error("AI risk explain error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to generate explanation" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
