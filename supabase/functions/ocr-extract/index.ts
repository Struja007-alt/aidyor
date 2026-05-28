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

// Retry configuration
const MAX_RETRIES = 2;
const RETRY_DELAYS = [1000, 2500]; // ms between retries

// ============================================
// OCR Address Correction Logic (embedded)
// ============================================

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

const HEX_CHARS = new Set('0123456789abcdefABCDEF');

interface CorrectionResult {
  corrected: string;
  confidence: number;
  corrections: string[];
  type: 'ethereum' | 'solana' | 'tron' | 'unknown';
}

function applyBasicCorrections(text: string): string {
  let result = '';
  for (const char of text) {
    if (HEX_CHARS.has(char)) {
      result += char;
    } else if (CHAR_CORRECTIONS[char]) {
      result += CHAR_CORRECTIONS[char];
    }
  }
  return result;
}

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

function correctEthAddress(rawAddress: string): CorrectionResult {
  const corrections: string[] = [];
  let normalized = rawAddress
    .replace(/^Ox/i, '0x')
    .replace(/^\bx(?=[a-fA-F0-9])/i, '0x');
  
  if (!normalized.startsWith('0x')) {
    normalized = '0x' + normalized;
  }
  
  const prefix = normalized.slice(0, 2);
  const body = normalized.slice(2);
  
  if (/^[a-fA-F0-9]{40}$/.test(body)) {
    return { corrected: prefix + body.toLowerCase(), confidence: 1.0, corrections: [], type: 'ethereum' };
  }
  
  const correctedBody = applyBasicCorrections(body);
  
  if (correctedBody.length === 40 && /^[a-fA-F0-9]{40}$/.test(correctedBody)) {
    const changesNeeded = countDifferences(body, correctedBody);
    const confidence = Math.max(0.5, 1 - (changesNeeded * 0.1));
    if (changesNeeded > 0) {
      corrections.push(`${changesNeeded} character(s) corrected`);
    }
    return { corrected: '0x' + correctedBody.toLowerCase(), confidence, corrections, type: 'ethereum' };
  }
  
  const finalAddress = correctedBody.slice(0, 40).padEnd(40, '0').toLowerCase();
  return {
    corrected: '0x' + finalAddress,
    confidence: 0.3,
    corrections: ['Multiple corrections applied, low confidence'],
    type: 'ethereum'
  };
}

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

function correctTronAddress(rawAddress: string): CorrectionResult {
  const corrections: string[] = [];
  let normalized = rawAddress;
  if (!normalized.startsWith('T')) {
    if (normalized.startsWith('t')) {
      normalized = 'T' + normalized.slice(1);
      corrections.push('Lowercase t corrected to T');
    } else {
      return { corrected: rawAddress, confidence: 0, corrections: ['Invalid Tron address'], type: 'tron' };
    }
  }
  
  const TRON_CORRECTIONS: Record<string, string> = { '0': 'O', 'O': 'o', 'I': '1', 'l': '1' };
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

function correctAddress(rawAddress: string): CorrectionResult {
  const trimmed = rawAddress.trim();
  if (/^[0O]x/i.test(trimmed)) return correctEthAddress(trimmed);
  if (trimmed.startsWith('T') || trimmed.startsWith('t')) return correctTronAddress(trimmed);
  if (trimmed.length >= 32 && trimmed.length <= 50) {
    const result = correctSolanaAddress(trimmed);
    if (result.confidence > 0.3) return result;
  }
  return { type: 'unknown', corrected: trimmed, confidence: 0, corrections: ['Unable to determine address type'] };
}

// ============================================
// AI Gateway call with retry + exponential backoff
// ============================================

async function callAIGateway(
  apiKey: string,
  model: string,
  messages: any[],
  maxTokens: number,
  temperature: number,
  attempt: number = 0
): Promise<{ ok: boolean; status: number; data?: any; error?: string }> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return { ok: true, status: response.status, data };
    }

    // Don't retry on rate limits or payment errors
    if (response.status === 429 || response.status === 402) {
      return { ok: false, status: response.status, error: `Status ${response.status}` };
    }

    // Retry on transient server errors (500, 502, 503, 504)
    if (attempt < MAX_RETRIES && response.status >= 500) {
      const delay = RETRY_DELAYS[attempt] || 2500;
      console.log(`[ocr-extract] AI gateway returned ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callAIGateway(apiKey, model, messages, maxTokens, temperature, attempt + 1);
    }

    const errorText = await response.text().catch(() => 'Unknown error');
    console.error(`[ocr-extract] AI gateway error: ${response.status} - ${errorText}`);
    return { ok: false, status: response.status, error: errorText };
  } catch (err) {
    // Retry on network errors
    if (attempt < MAX_RETRIES) {
      const delay = RETRY_DELAYS[attempt] || 2500;
      console.log(`[ocr-extract] Network error, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callAIGateway(apiKey, model, messages, maxTokens, temperature, attempt + 1);
    }
    return { ok: false, status: 0, error: err instanceof Error ? err.message : 'Network error' };
  }
}

// ============================================
// Prompt definitions
// ============================================

const PRIMARY_SYSTEM_PROMPT = `You are a specialized blockchain contract address and token info extractor.

SUPPORTED ADDRESS FORMATS:
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
4. EXTRACT ALL ADDRESSES VISIBLE — do not stop after the first one. A screenshot
   may contain multiple tokens (lists, comparisons, swap pairs, portfolio views).
5. Return results in this EXACT format (one item per line):
   - Full valid addresses: just the address on its own line
   - If an address is TRUNCATED (shows "..." or "…" or only shows start and end), output: TRUNCATED:visible_start...visible_end
   - Token name if visible: TOKEN_NAME:the_token_name
   - Token symbol if visible: TOKEN_SYMBOL:the_symbol
6. If you see "contract:" or similar labels, the address follows it
7. If no addresses AND no token info found, return "NONE"
8. Do NOT include explanations, markdown, or formatting

EXAMPLE OUTPUT for a screenshot showing "SUBHUB" token with truncated address "0x9efd...25068c":
TOKEN_NAME:SUBHUB
TOKEN_SYMBOL:SUBHUB
TRUNCATED:0x9efd...25068c

EXAMPLE OUTPUT for a full address with token info:
TOKEN_NAME:Pepe
TOKEN_SYMBOL:PEPE
0x6982508145454Ce325dDbE47a25d4ec3d2311933`;

const ENHANCED_SYSTEM_PROMPT = `You are an expert blockchain address reader with forensic-level visual analysis skills.

Your task: Extract ALL contract addresses from this cryptocurrency screenshot. Focus on accuracy above all else.

STEP-BY-STEP APPROACH:
1. First scan the ENTIRE image for any text that looks like a blockchain address
2. Look for common UI patterns: "Contract:", "Token Address:", "CA:", copy buttons next to addresses
3. Read each character individually - zoom into the address mentally
4. Cross-check ambiguous characters using context (hex addresses only use 0-9 and a-f)
5. Verify the address length is correct before outputting

SUPPORTED FORMATS:
- Ethereum/EVM: 0x + exactly 40 hex chars → Example: 0x6982508145454Ce325dDbE47a25d4ec3d2311933
- Solana: Base58, 32-44 chars (excludes 0, O, I, l) → Example: So11111111111111111111111111111112
- Tron: T + 33 Base58 chars → Example: T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb

COMMON OCR TRAPS TO AVOID:
- "rn" can look like "m" → read carefully
- "cl" can look like "d" → verify
- Dark mode screenshots may have inverted contrast
- Small/low-res text needs extra care on hex chars

OUTPUT FORMAT (one per line, no markdown, no explanation):
- Full address: the address itself
- Truncated: TRUNCATED:visible_start...visible_end
- Token name: TOKEN_NAME:name
- Token symbol: TOKEN_SYMBOL:symbol
- Nothing found: NONE`;

const USER_PROMPT = "Extract all contract addresses and token info from this screenshot. Include full addresses, truncated address fragments (with TRUNCATED: prefix), and any visible token name (TOKEN_NAME:) and symbol (TOKEN_SYMBOL:).";

const ENHANCED_USER_PROMPT = "I need you to very carefully extract contract addresses from this image. The previous attempt found nothing - please look harder at every part of the image. Check headers, footers, sidebars, small text, QR codes, and any data fields. Even partial or truncated addresses are useful. Also extract any token name or symbol visible.";

// Pass 3: Pixel-level raw character extraction for extremely difficult images
const PIXEL_LEVEL_SYSTEM_PROMPT = `You are a raw character transcription engine with pixel-level visual analysis.

CRITICAL DIRECTIVE: Analyze this image pixel by pixel. Ignore ALL graphical elements — icons, logos, charts, borders, backgrounds, gradients, and decorative shapes. Focus SOLELY on alphanumeric characters rendered as text anywhere in the image.

Even if the text is:
- Blurry or low resolution
- Upside down or rotated
- Partially obscured or cropped
- In dark mode with low contrast
- Very small or compressed
- Overlapping with other elements

...transcribe EVERY identifiable character into raw strings.

AFTER raw transcription, scan your output for anything matching these blockchain address patterns:
- Ethereum/EVM: 0x followed by 40 hex characters (0-9, a-f, A-F)
- Solana: Base58 string, 32-44 characters (characters: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz)
- Tron: T followed by 33 Base58 characters

CHARACTER DISAMBIGUATION RULES (apply during transcription):
- If context is a hex address: O→0, I→1, l→1, S→5, G→6, Z→2
- If context is Base58: 0→o, O→o, I→1, l→1
- Adjacent character patterns help: "0x" prefix means hex follows
- "T" at position 0 followed by 33 alphanumerics = Tron

OUTPUT FORMAT (one per line, no markdown, no explanation):
- RAW_TEXT:the_raw_transcribed_text (for each text block found)
- Full valid address on its own line
- TRUNCATED:visible_start...visible_end
- TOKEN_NAME:name
- TOKEN_SYMBOL:symbol
- NONE if absolutely nothing found`;

const PIXEL_LEVEL_USER_PROMPT = "Two previous AI passes failed to extract any addresses from this image. Perform a pixel-by-pixel analysis: transcribe ALL visible alphanumeric text first as raw strings, then identify any blockchain addresses or token info within the transcribed text. Include even partial or low-confidence matches.";

// ============================================
// Response parser
// ============================================

interface ParsedVLMResponse {
  rawAddresses: string[];
  truncatedFragments: string[];
  tokenName: string | null;
  tokenSymbol: string | null;
}

function extractAddressesFromRawText(text: string): string[] {
  const found: string[] = [];
  // Ethereum pattern
  const ethMatches = text.match(/0x[a-fA-F0-9]{40}/g);
  if (ethMatches) found.push(...ethMatches);
  // Solana pattern (Base58, 32-44 chars)
  const solMatches = text.match(/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g);
  if (solMatches) found.push(...solMatches.filter(m => !m.startsWith('0x')));
  // Tron pattern
  const tronMatches = text.match(/T[A-Za-z1-9]{33}/g);
  if (tronMatches) found.push(...tronMatches);
  return found;
}

function parseVLMResponse(content: string): ParsedVLMResponse {
  const lines = content.split("\n").map((l: string) => l.trim()).filter((l: string) => l && l !== "NONE");
  
  const rawAddresses: string[] = [];
  const truncatedFragments: string[] = [];
  let tokenName: string | null = null;
  let tokenSymbol: string | null = null;
  
  for (const line of lines) {
    const cleaned = line.replace(/[`*\[\]]/g, "").trim();
    
    if (cleaned.startsWith("TOKEN_NAME:")) {
      tokenName = cleaned.replace("TOKEN_NAME:", "").trim();
      continue;
    }
    
    if (cleaned.startsWith("TOKEN_SYMBOL:")) {
      tokenSymbol = cleaned.replace("TOKEN_SYMBOL:", "").trim();
      continue;
    }
    
    if (cleaned.startsWith("TRUNCATED:")) {
      const fragment = cleaned.replace("TRUNCATED:", "").trim();
      if (fragment.length >= 5) {
        truncatedFragments.push(fragment);
      }
      continue;
    }
    
    // Handle RAW_TEXT: lines from pixel-level pass — mine addresses from raw transcription
    if (cleaned.startsWith("RAW_TEXT:")) {
      const rawText = cleaned.replace("RAW_TEXT:", "").trim();
      const extracted = extractAddressesFromRawText(rawText);
      rawAddresses.push(...extracted);
      continue;
    }
    
    if (cleaned.length >= 10) {
      rawAddresses.push(cleaned);
    }
  }
  
  return { rawAddresses, truncatedFragments, tokenName, tokenSymbol };
}

// ============================================
// Address validation + correction
// ============================================

interface ProcessedAddress {
  original: string;
  corrected: string;
  type: string;
  confidence: number;
  corrections: string[];
}

function processAddresses(rawAddresses: string[]): {
  validAddresses: string[];
  processedAddresses: ProcessedAddress[];
  totalCorrections: number;
} {
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
    
    if (result.confidence >= 0.5) {
      const corrected = result.corrected;
      if (/^0x[a-fA-F0-9]{40}$/.test(corrected)) {
        validAddresses.push(corrected.toLowerCase());
        totalCorrections += result.corrections.length;
      } else if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(corrected)) {
        validAddresses.push(corrected);
        totalCorrections += result.corrections.length;
      } else if (/^T[A-Za-z1-9]{33}$/.test(corrected)) {
        validAddresses.push(corrected);
        totalCorrections += result.corrections.length;
      }
    }
  }
  
  return { validAddresses, processedAddresses, totalCorrections };
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

    if (imageBase64.length > MAX_IMAGE_SIZE) {
      return new Response(
        JSON.stringify({ error: "Image too large. Maximum size is 10MB." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    const imageUrl = imageBase64.startsWith("data:") ? imageBase64 : `data:image/png;base64,${imageBase64}`;

    // ============================================
    // PASS 1 (PARALLEL): Primary extraction with Gemini 2.5 Pro AND
    // a fast Flash pass run concurrently. We take whichever returns
    // valid addresses first to cut latency roughly in half on common
    // screenshots, while keeping Pro accuracy as a fallback.
    // ============================================
    // Upgraded to the newest free Gemini 3.x preview models for higher
    // accuracy + lower latency than 2.5. Pro-preview = forensic accuracy,
    // 3.5-flash = fast confirmation pass.
    console.log("[ocr-extract] Pass 1 (parallel): gemini-3.1-pro-preview + gemini-3.5-flash");

    const proCall = callAIGateway(
      LOVABLE_API_KEY,
      "google/gemini-3.1-pro-preview",
      [
        { role: "system", content: PRIMARY_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: USER_PROMPT },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }
      ],
      600,
      0.1
    );

    const flashCall = callAIGateway(
      LOVABLE_API_KEY,
      "google/gemini-3.5-flash",
      [
        { role: "system", content: PRIMARY_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: USER_PROMPT },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }
      ],
      600,
      0.1
    );

    const [proResult, flashResult] = await Promise.all([proCall, flashCall]);

    // Merge both results — use whichever found more valid addresses,
    // and union token name/symbol/truncated fragments.
    const proContent = proResult.ok ? (proResult.data?.choices?.[0]?.message?.content || "") : "";
    const flashContent = flashResult.ok ? (flashResult.data?.choices?.[0]?.message?.content || "") : "";
    console.log(`[ocr-extract] Pass1 pro: ${proContent.length} chars | flash: ${flashContent.length} chars`);

    const proParsed = parseVLMResponse(proContent);
    const flashParsed = parseVLMResponse(flashContent);
    const proProcessed = processAddresses(proParsed.rawAddresses);
    const flashProcessed = processAddresses(flashParsed.rawAddresses);

    // Union of valid addresses (dedup by lowercase)
    const addressMap = new Map<string, ProcessedAddress>();
    for (const p of [...proProcessed.processedAddresses, ...flashProcessed.processedAddresses]) {
      const key = p.corrected.toLowerCase();
      const existing = addressMap.get(key);
      if (!existing || p.confidence > existing.confidence) {
        addressMap.set(key, p);
      }
    }
    let processedAddresses = Array.from(addressMap.values());
    let validAddresses = processedAddresses
      .filter((p) => p.confidence >= 0.5)
      .map((p) => p.corrected);
    let totalCorrections = processedAddresses.reduce((s, p) => s + p.corrections.length, 0);
    let parsed = {
      rawAddresses: [...proParsed.rawAddresses, ...flashParsed.rawAddresses],
      truncatedFragments: Array.from(new Set([...proParsed.truncatedFragments, ...flashParsed.truncatedFragments])),
      tokenName: proParsed.tokenName || flashParsed.tokenName,
      tokenSymbol: proParsed.tokenSymbol || flashParsed.tokenSymbol,
    };
    let content = proContent || flashContent;

    // Synthesize a non-fatal status object for downstream pass logic
    const pass1Result = {
      ok: proResult.ok || flashResult.ok,
      status: proResult.ok ? proResult.status : flashResult.status,
      error: proResult.error || flashResult.error,
    };

    if (!pass1Result.ok) {
      if (pass1Result.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (pass1Result.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable." }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ============================================
    // PASS 2: Enhanced re-extraction if parallel Pass 1 found nothing
    // ============================================
    let pass2Attempted = false;
    if (validAddresses.length === 0 && !parsed.tokenName && !parsed.tokenSymbol && parsed.truncatedFragments.length === 0) {
      pass2Attempted = true;
      console.log("[ocr-extract] Pass 1 (parallel) found nothing. Pass 2: Enhanced re-extraction with gemini-3.1-pro-preview forensic prompt");

      const pass2Result = await callAIGateway(
        LOVABLE_API_KEY,
        "google/gemini-3.1-pro-preview",
        [
          { role: "system", content: ENHANCED_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: ENHANCED_USER_PROMPT },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
        800,
        0.2
      );

      if (pass2Result.ok) {
        const pass2Content = pass2Result.data?.choices?.[0]?.message?.content || "";
        console.log(`[ocr-extract] Pass 2 raw response: ${pass2Content}`);

        const pass2Parsed = parseVLMResponse(pass2Content);
        const pass2Processed = processAddresses(pass2Parsed.rawAddresses);

        // Merge results — Pass 2 supplements Pass 1 (union, not replace)
        for (const p of pass2Processed.processedAddresses) {
          const key = p.corrected.toLowerCase();
          const existing = addressMap.get(key);
          if (!existing || p.confidence > existing.confidence) {
            addressMap.set(key, p);
          }
        }
        processedAddresses = Array.from(addressMap.values());
        validAddresses = processedAddresses
          .filter((p) => p.confidence >= 0.5)
          .map((p) => p.corrected);
        totalCorrections = processedAddresses.reduce((s, p) => s + p.corrections.length, 0);
        if (pass2Processed.validAddresses.length > 0) content = pass2Content;
        
        // Also merge token info and truncated fragments
        if (!parsed.tokenName && pass2Parsed.tokenName) parsed.tokenName = pass2Parsed.tokenName;
        if (!parsed.tokenSymbol && pass2Parsed.tokenSymbol) parsed.tokenSymbol = pass2Parsed.tokenSymbol;
        if (parsed.truncatedFragments.length === 0 && pass2Parsed.truncatedFragments.length > 0) {
          parsed.truncatedFragments = pass2Parsed.truncatedFragments;
        }
      } else {
        console.warn(`[ocr-extract] Pass 2 failed with status ${pass2Result.status}`);
      }
    }

    // ============================================
    // PASS 3: Pixel-level raw character extraction as last resort
    // ============================================
    let pass3Attempted = false;
    if (validAddresses.length === 0 && !parsed.tokenName && !parsed.tokenSymbol && parsed.truncatedFragments.length === 0) {
      pass3Attempted = true;
      console.log("[ocr-extract] Pass 1+2 found nothing. Pass 3: Pixel-level raw character extraction with gemini-3.1-pro-preview");

      const pass3Result = await callAIGateway(
        LOVABLE_API_KEY,
        "google/gemini-3.1-pro-preview",
        [
          { role: "system", content: PIXEL_LEVEL_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: PIXEL_LEVEL_USER_PROMPT },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
        1000, // Higher token limit for raw transcription
        0.3   // Higher temperature for aggressive character interpretation
      );

      if (pass3Result.ok) {
        const pass3Content = pass3Result.data?.choices?.[0]?.message?.content || "";
        console.log(`[ocr-extract] Pass 3 raw response: ${pass3Content}`);

        const pass3Parsed = parseVLMResponse(pass3Content);
        const pass3Processed = processAddresses(pass3Parsed.rawAddresses);

        for (const p of pass3Processed.processedAddresses) {
          const key = p.corrected.toLowerCase();
          const existing = addressMap.get(key);
          if (!existing || p.confidence > existing.confidence) {
            addressMap.set(key, p);
          }
        }
        processedAddresses = Array.from(addressMap.values());
        validAddresses = processedAddresses
          .filter((p) => p.confidence >= 0.5)
          .map((p) => p.corrected);
        totalCorrections = processedAddresses.reduce((s, p) => s + p.corrections.length, 0);
        if (pass3Processed.validAddresses.length > 0) content = pass3Content;

        if (!parsed.tokenName && pass3Parsed.tokenName) parsed.tokenName = pass3Parsed.tokenName;
        if (!parsed.tokenSymbol && pass3Parsed.tokenSymbol) parsed.tokenSymbol = pass3Parsed.tokenSymbol;
        if (parsed.truncatedFragments.length === 0 && pass3Parsed.truncatedFragments.length > 0) {
          parsed.truncatedFragments = pass3Parsed.truncatedFragments;
        }
      } else {
        console.warn(`[ocr-extract] Pass 3 failed with status ${pass3Result.status}`);
      }
    }

    const passCount = pass3Attempted ? 3 : (pass2Attempted ? 2 : 1);
    const modelUsed = pass3Attempted
      ? "gemini-3.1-pro+3.5-flash(parallel)+3.1-pro-forensic+3.1-pro-pixel"
      : (pass2Attempted
        ? "gemini-3.1-pro+3.5-flash(parallel)+3.1-pro-forensic"
        : "gemini-3.1-pro+3.5-flash(parallel)");

    console.log(`[ocr-extract] Final: ${validAddresses.length} valid addresses, ${parsed.truncatedFragments.length} truncated, token: ${parsed.tokenName}/${parsed.tokenSymbol}, passes: ${passCount}`);

    // Build per-address confidence array (aligned with validAddresses)
    const addressConfidences = validAddresses.map((addr) => {
      const p = addressMap.get(addr.toLowerCase());
      return p ? Math.round(p.confidence * 100) : 50;
    });

    return new Response(
      JSON.stringify({ 
        addresses: validAddresses, 
        addressConfidences,
        raw: content,
        tokenName: parsed.tokenName || null,
        tokenSymbol: parsed.tokenSymbol || null,
        truncatedAddresses: parsed.truncatedFragments.length > 0 ? parsed.truncatedFragments : null,
        corrections: {
          applied: totalCorrections > 0,
          count: totalCorrections,
          details: processedAddresses
        },
        metadata: {
          model: modelUsed,
          passes: passCount,
          parallel: true,
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
