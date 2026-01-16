import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Use Gemini Flash for fast vision-based OCR
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
messages: [
          {
            role: "system",
            content: `You are a specialized blockchain contract address extractor with expert accuracy.

SUPPORTED FORMATS:
- Ethereum/EVM: 0x followed by EXACTLY 40 hex characters (0-9, a-f, A-F)
  Example: 0x6982508145454Ce325dDbE47a25d4ec3d2311933
- Solana: Base58 encoded, 32-44 characters (no 0, O, I, l)
  Example: So11111111111111111111111111111112
- Tron: T followed by 33 alphanumeric characters
  Example: T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb

CRITICAL INSTRUCTIONS:
1. Read the contract address VERY CAREFULLY character by character
2. Pay special attention to similar-looking characters:
   - 0 (zero) vs O (letter O) vs o (lowercase o)
   - 1 (one) vs l (lowercase L) vs I (uppercase i)
   - 8 (eight) vs B (letter B)
   - 5 (five) vs S (letter S)
   - 6 (six) vs G (letter G) vs b (letter b)
   - 2 (two) vs Z (letter Z)
3. The address MUST be exactly the right length (40 hex chars for ETH after 0x)
4. Return ONLY the addresses, one per line
5. If you see "contract:" or similar labels, the address follows it
6. If no valid addresses found, return "NONE"
7. Do NOT include explanations, markdown, or formatting - just raw addresses`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all contract addresses from this screenshot. Return only the addresses, one per line."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/png;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse addresses from response
    const addresses: string[] = [];
    const lines = content.split("\n").map((l: string) => l.trim()).filter((l: string) => l && l !== "NONE");
    
    for (const line of lines) {
      // Clean up any markdown or extra characters
      const cleaned = line.replace(/[`*\[\]]/g, "").trim();
      
      // Validate Ethereum addresses
      if (/^0x[a-fA-F0-9]{40}$/.test(cleaned)) {
        addresses.push(cleaned.toLowerCase());
      }
      // Validate Solana addresses (Base58, 32-44 chars)
      else if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(cleaned)) {
        addresses.push(cleaned);
      }
      // Validate Tron addresses
      else if (/^T[A-Za-z1-9]{33}$/.test(cleaned)) {
        addresses.push(cleaned);
      }
    }

    return new Response(
      JSON.stringify({ addresses, raw: content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("OCR extraction error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
