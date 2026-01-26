import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Max image size: 10MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

serve(async (req) => {
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

    console.log(`[ocr-extract] Request from user: ${user.id}`);

    const { imageBase64 } = await req.json();
    
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return new Response(
        JSON.stringify({ error: "Invalid request format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate image size
    if (imageBase64.length > MAX_IMAGE_SIZE) {
      return new Response(
        JSON.stringify({ error: "Image too large. Maximum size is 10MB." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate image format
    if (!imageBase64.startsWith("data:image/") && !/^[A-Za-z0-9+/=]+$/.test(imageBase64)) {
      return new Response(
        JSON.stringify({ error: "Invalid image format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("[ocr-extract] LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Service temporarily unavailable" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      const status = response.status;
      console.error(`[ocr-extract] AI gateway error: ${status}`);
      
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

    console.log(`[ocr-extract] Extracted ${addresses.length} addresses`);

    return new Response(
      JSON.stringify({ addresses, raw: content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[ocr-extract] Error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
