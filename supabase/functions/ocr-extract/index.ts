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

// Max image size: 10MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

// ============================================
// OCR Address Correction Logic (embedded)
// ============================================

// Character corrections for common OCR misreads
const CHAR_CORRECTIONS: Record<string, string> = {
  'O': '0', 'o': '0', 'Q': '0',
  'l': '1', 'I': '1', 'i': '1', '|': '1', '!': '1',
  'Z': '2', 'z': '2',
  'S': '5', 's': '5',
  'G': '6',
  '?': '7', 'T': '7',
  'g': '9', 'q': '9',
  'h': 'b', 'H': 'B', 'R': 'B',
  'P': 'F',
};

// Valid hex characters
const HEX_CHARS = new Set('0123456789abcdefABCDEF');

interface CorrectionResult {
  corrected: string;
  confidence: number;
  corrections: string[];
  type: 'ethereum' | 'solana' | 'tron' | 'unknown';
}

// Apply basic character corrections for hex addresses
function applyBasicCorrections(text: string): string {
  let result = '';
  for (const char of text) {
    if (HEX_CHARS.has(char)) {
      result += char;
    } else if (CHAR_CORRECTIONS[char]) {
      result += CHAR_CORRECTIONS[char];
    }
    // Skip invalid characters entirely
  }
  return result;
}

// Count character differences between two strings
function countDifferences(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  let diff = Math.abs(a.length - b.length);
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i].toLowerCase() !== b[i].toLowerCase()) {
      diff++;
    }
  }
  return diff;
}

// Correct an Ethereum address
function correctEthAddress(rawAddress: string): CorrectionResult {
  const corrections: string[] = [];
  
  // Fix common prefix issues
  let normalized = rawAddress
    .replace(/^Ox/i, '0x')
    .replace(/^\\bx(?=[a-fA-F0-9])/i, '0x');
  
  if (!normalized.startsWith('0x')) {
    normalized = '0x' + normalized;
  }
  
  const prefix = normalized.slice(0, 2);
  const body = normalized.slice(2);
  
  // Quick path: if already valid
  if (/^[a-fA-F0-9]{40}$/.test(body)) {
    return {
      corrected: prefix + body.toLowerCase(),
      confidence: 1.0,
      corrections: [],
      type: 'ethereum'
    };
  }
  
  // Apply corrections
  const correctedBody = applyBasicCorrections(body);
  
  if (correctedBody.length === 40 && /^[a-fA-F0-9]{40}$/.test(correctedBody)) {
    const changesNeeded = countDifferences(body, correctedBody);
    const confidence = Math.max(0.5, 1 - (changesNeeded * 0.1));
    
    if (changesNeeded > 0) {
      corrections.push(`${changesNeeded} character(s) corrected`);
    }
    
    return {
      corrected: '0x' + correctedBody.toLowerCase(),
      confidence,
      corrections,
      type: 'ethereum'
    };
  }
  
  // Fallback: pad or truncate
  const finalAddress = correctedBody.slice(0, 40).padEnd(40, '0').toLowerCase();
  return {
    corrected: '0x' + finalAddress,
    confidence: 0.3,
    corrections: ['Multiple corrections applied, low confidence'],
    type: 'ethereum'
  };
}

// Correct a Solana address (Base58, no 0, O, I, l allowed)
function correctSolanaAddress(rawAddress: string): CorrectionResult {
  const corrections: string[] = [];
  const BASE58_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const BASE58_SET = new Set(BASE58_CHARS);
  
  const SOLANA_CORRECTIONS: Record<string, string> = {
    '0': 'o', 'O': 'o', 'I': '1', 'l': '1',
  };
  
  let corrected = '';
  let changesCount = 0;
  
  for (const char of rawAddress) {
    if (BASE58_SET.has(char)) {
      corrected += char;
    } else if (SOLANA_CORRECTIONS[char]) {
      corrected += SOLANA_CORRECTIONS[char];
      changesCount++;
    }
  }
  
  if (changesCount > 0) {
    corrections.push(`${changesCount} invalid Base58 character(s) corrected`);
  }
  
  const isValidLength = corrected.length >= 32 && corrected.length <= 44;
  const confidence = isValidLength ? Math.max(0.5, 1 - (changesCount * 0.1)) : 0.2;
  
  return { corrected, confidence, corrections, type: 'solana' };
}

// Correct a Tron address (T + 33 alphanumeric)
function correctTronAddress(rawAddress: string): CorrectionResult {
  const corrections: string[] = [];
  
  let normalized = rawAddress;
  if (!normalized.startsWith('T')) {
    if (normalized.startsWith('t')) {
      normalized = 'T' + normalized.slice(1);
      corrections.push('Lowercase t corrected to T');
    } else {
      return {
        corrected: rawAddress,
        confidence: 0,
        corrections: ['Invalid Tron address: must start with T'],
        type: 'tron'
      };
    }
  }
  
  const TRON_CORRECTIONS: Record<string, string> = {
    '0': 'O', 'O': 'o', 'I': '1', 'l': '1',
  };
  
  let corrected = 'T';
  let changesCount = 0;
  
  for (let i = 1; i < normalized.length; i++) {
    const char = normalized[i];
    if (/[A-Za-z1-9]/.test(char)) {
      corrected += char;
    } else if (TRON_CORRECTIONS[char]) {
      corrected += TRON_CORRECTIONS[char];
      changesCount++;
    }
  }
  
  if (changesCount > 0) {
    corrections.push(`${changesCount} character(s) corrected`);
  }
  
  const isValidLength = corrected.length === 34;
  const confidence = isValidLength ? Math.max(0.5, 1 - (changesCount * 0.1)) : 0.2;
  
  return { corrected, confidence, corrections, type: 'tron' };
}

// Auto-detect and correct address
function correctAddress(rawAddress: string): CorrectionResult {
  const trimmed = rawAddress.trim();
  
  // Ethereum: starts with 0x or Ox (OCR error)
  if (/^[0O]x/i.test(trimmed)) {
    return correctEthAddress(trimmed);
  }
  
  // Tron: starts with T
  if (trimmed.startsWith('T') || trimmed.startsWith('t')) {
    return correctTronAddress(trimmed);
  }
  
  // Solana: Base58, 32-44 chars
  if (trimmed.length >= 32 && trimmed.length <= 50) {
    const result = correctSolanaAddress(trimmed);
    if (result.confidence > 0.3) {
      return result;
    }
  }
  
  return {
    type: 'unknown',
    corrected: trimmed,
    confidence: 0,
    corrections: ['Unable to determine address type']
  };
}

// ============================================
// Main Edge Function
// ============================================

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
    const rawAddresses: string[] = [];
    const lines = content.split("\n").map((l: string) => l.trim()).filter((l: string) => l && l !== "NONE");
    
    for (const line of lines) {
      // Clean up any markdown or extra characters
      const cleaned = line.replace(/[`*\[\]]/g, "").trim();
      if (cleaned.length >= 10) {
        rawAddresses.push(cleaned);
      }
    }

    // Apply OCR corrections to each extracted address
    interface ProcessedAddress {
      original: string;
      corrected: string;
      type: string;
      confidence: number;
      corrections: string[];
    }
    
    const processedAddresses: ProcessedAddress[] = [];
    const validAddresses: string[] = [];
    let totalCorrections = 0;
    
    for (const rawAddr of rawAddresses) {
      const result = correctAddress(rawAddr);
      
      processedAddresses.push({
        original: rawAddr,
        corrected: result.corrected,
        type: result.type,
        confidence: result.confidence,
        corrections: result.corrections
      });
      
      // Only include addresses with reasonable confidence
      if (result.confidence >= 0.5) {
        // Final validation after correction
        const corrected = result.corrected;
        
        // Validate Ethereum addresses
        if (/^0x[a-fA-F0-9]{40}$/.test(corrected)) {
          validAddresses.push(corrected.toLowerCase());
          totalCorrections += result.corrections.length;
        }
        // Validate Solana addresses (Base58, 32-44 chars)
        else if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(corrected)) {
          validAddresses.push(corrected);
          totalCorrections += result.corrections.length;
        }
        // Validate Tron addresses
        else if (/^T[A-Za-z1-9]{33}$/.test(corrected)) {
          validAddresses.push(corrected);
          totalCorrections += result.corrections.length;
        }
      }
    }

    console.log(`[ocr-extract] Extracted ${rawAddresses.length} raw, ${validAddresses.length} valid after correction, ${totalCorrections} corrections applied`);

    return new Response(
      JSON.stringify({ 
        addresses: validAddresses, 
        raw: content,
        corrections: {
          applied: totalCorrections > 0,
          count: totalCorrections,
          details: processedAddresses
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[ocr-extract] Error:", error);
    const origin = req.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
