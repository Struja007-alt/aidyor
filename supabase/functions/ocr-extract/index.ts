import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const ALLOWED_ORIGINS = [
  'https://aidyor.app',
  'https://www.aidyor.app',
  'http://localhost:5173',
  'http://localhost:8080',
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = isAllowedOrigin(origin) ? origin! : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_RETRIES = 2;
const RETRY_DELAYS = [1000, 2500];

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

function parseDataUrl(input: string): { mimeType: string; data: string } {
  const match = input.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]*)$/);
  if (match) return { mimeType: match[1], data: match[2] };
  return { mimeType: 'image/png', data: input };
}

async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userText: string,
  imageInline: { mimeType: string; data: string } | null,
  maxTokens: number,
  temperature: number,
  attempt: number = 0
): Promise<{ ok: boolean; status: number; text?: string; error?: string }> {
  try {
    const parts: any[] = [{ text: userText }];
    if (imageInline) {
      parts.push({ inline_data: { mime_type: imageInline.mimeType, data: imageInline.data } });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts }],
          generationConfig: { maxOutputTokens: maxTokens, temperature },
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      const text = (data.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || "").join("");
      return { ok: true, status: response.status, text };
    }

    if (response.status === 429) {
      return { ok: false, status: response.status, error: `Status ${response.status}` };
    }

    if (attempt < MAX_RETRIES && response.status >= 500) {
      const delay = RETRY_DELAYS[attempt] || 2500;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return callGemini(apiKey, model, systemPrompt, userText, imageInline, maxTokens, temperature, attempt + 1);
    }

    const errorText = await response.text().catch(() => 'Unknown error');
    console.error(`[ocr-extract] Gemini error: ${response.status} - ${errorText}`);
    return { ok: false, status: response.status, error: errorText };
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      const delay = RETRY_DELAYS[attempt] || 2500;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return callGemini(apiKey, model, systemPrompt, userText, imageInline, maxTokens, temperature, attempt + 1);
    }
    return { ok: false, status: 0, error: err instanceof Error ? err.message : 'Network error' };
  }
}

const PRIMARY_SYSTEM_PROMPT = `You are a specialized blockchain contract address and token info extractor.

SUPPORTED ADDRESS FORMATS:
- Ethereum/EVM: 0x followed by EXACTLY 40 hex characters (0-9, a-f, A-F)
- Solana: Base58 encoded, 32-44 characters (no 0, O, I, l)
- Tron: T followed by 33 alphanumeric characters

CRITICAL INSTRUCTIONS:
1. Read the contract address VERY CAREFULLY character by character
2. Pay special attention to similar-looking characters
3. The address MUST be exactly the right length
4. EXTRACT ALL ADDRESSES VISIBLE
5. Return results one item per line
6. If you see 'contract:' or similar labels, the address follows it
7. If no addresses AND no token info found, return "NONE"
8. Do NOT include explanations, markdown, or formatting`;

const ENHANCED_SYSTEM_PROMPT = `You are an expert blockchain address reader with forensic-level visual analysis skills. Extract ALL contract addresses from this cryptocurrency screenshot, checking labels, small text, and ambiguous characters carefully. OUTPUT FORMAT (one per line, no markdown): full address, TRUNCATED:start...end, TOKEN_NAME:name, TOKEN_SYMBOL:symbol, or NONE.`;

const USER_PROMPT = "Extract all contract addresses and token info from this screenshot. Include full addresses, truncated address fragments (with TRUNCATED: prefix), and any visible token name (TOKEN_NAME:) and symbol (TOKEN_SYMBOL:).";

const ENHANCED_USER_PROMPT = "I need you to very carefully extract contract addresses from this image. The previous attempt found nothing - please look harder at every part of the image. Check headers, footers, sidebars, small text, QR codes, and any data fields. Even partial or truncated addresses are useful. Also extract any token name or symbol visible.";

const PIXEL_LEVEL_SYSTEM_PROMPT = `You are a raw character transcription engine with pixel-level visual analysis. Transcribe EVERY identifiable character into raw strings, then scan for blockchain address patterns (ETH 0x+40hex, Solana Base58 32-44, Tron T+33). OUTPUT: RAW_TEXT:text, address lines, TRUNCATED:, TOKEN_NAME:, TOKEN_SYMBOL:, or NONE.`;

const PIXEL_LEVEL_USER_PROMPT = "Two previous AI passes failed to extract any addresses from this image. Perform a pixel-by-pixel analysis: transcribe ALL visible alphanumeric text first as raw strings, then identify any blockchain addresses or token info within the transcribed text. Include even partial or low-confidence matches.";

interface ParsedVLMResponse {
  rawAddresses: string[];
  truncatedFragments: string[];
  tokenName: string | null;
  tokenSymbol: string | null;
}

function extractAddressesFromRawText(text: string): string[] {
  const found: string[] = [];
  const ethMatches = text.match(/0x[a-fA-F0-9]{40}/g);
  if (ethMatches) found.push(...ethMatches);
  const solMatches = text.match(/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g);
  if (solMatches) found.push(...solMatches.filter(m => !m.startsWith('0x')));
  const tronMatches = text.match(/T[A-Za-z1-9]{33}/g);
  if (tronMatches) found.push(...tronMatches);
  return found;
}

function parseVLMResponse(content: string): ParsedVLMResponse {
  const lines = content.split("\n").map((l) => l.trim()).filter((l) => l && l !== "NONE");

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
      if (fragment.length >= 5) truncatedFragments.push(fragment);
      continue;
    }
    if (cleaned.startsWith("RAW_TEXT:")) {
      const rawText = cleaned.replace("RAW_TEXT:", "").trim();
      rawAddresses.push(...extractAddressesFromRawText(rawText));
      continue;
    }
    if (cleaned.length >= 10) rawAddresses.push(cleaned);
  }

  return { rawAddresses, truncatedFragments, tokenName, tokenSymbol };
}

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

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    console.log(`[ocr-extract] Request from ${user ? `user: ${user.id}` : 'anonymous visitor'}`);

    const { imageBase64 } = await req.json();

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return new Response(JSON.stringify({ error: "Invalid request format" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (imageBase64.length > MAX_IMAGE_SIZE) {
      return new Response(JSON.stringify({ error: "Image too large. Maximum size is 10MB." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!imageBase64.startsWith("data:image/") && !/^[A-Za-z0-9+/=]+$/.test(imageBase64)) {
      return new Response(JSON.stringify({ error: "Invalid image format" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("[ocr-extract] GEMINI_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Service temporarily unavailable" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const imageInline = parseDataUrl(imageBase64);

    console.log("[ocr-extract] Pass 1 (parallel): gemini-3.1-pro-preview + gemini-3.8-flash");

    const proCall = callGemini(GEMINI_API_KEY, "gemini-3.1-pro-preview", PRIMARY_SYSTEM_PROMPT, USER_PROMPT, imageInline, 600, 0.1);
    const flashCall = callGemini(GEMINI_API_KEY, "gemini-3.8-flash", PRIMARY_SYSTEM_PROMPT, USER_PROMPT, imageInline, 600, 0.1);

    const [proResult, flashResult] = await Promise.all([proCall, flashCall]);

    const proContent = proResult.ok ? (proResult.text || "") : "";
    const flashContent = flashResult.ok ? (flashResult.text || "") : "";

    const proParsed = parseVLMResponse(proContent);
    const flashParsed = parseVLMResponse(flashContent);
    const proProcessed = processAddresses(proParsed.rawAddresses);
    const flashProcessed = processAddresses(flashParsed.rawAddresses);

    const addressMap = new Map<string, ProcessedAddress>();
    for (const p of [...proProcessed.processedAddresses, ...flashProcessed.processedAddresses]) {
      const key = p.corrected.toLowerCase();
      const existing = addressMap.get(key);
      if (!existing || p.confidence > existing.confidence) addressMap.set(key, p);
    }
    let processedAddresses = Array.from(addressMap.values());
    let validAddresses = processedAddresses.filter((p) => p.confidence >= 0.5).map((p) => p.corrected);
    let totalCorrections = processedAddresses.reduce((s, p) => s + p.corrections.length, 0);
    let parsed = {
      rawAddresses: [...proParsed.rawAddresses, ...flashParsed.rawAddresses],
      truncatedFragments: Array.from(new Set([...proParsed.truncatedFragments, ...flashParsed.truncatedFragments])),
      tokenName: proParsed.tokenName || flashParsed.tokenName,
      tokenSymbol: proParsed.tokenSymbol || flashParsed.tokenSymbol,
    };
    let content = proContent || flashContent;

    const pass1Result = {
      ok: proResult.ok || flashResult.ok,
      status: proResult.ok ? proResult.status : flashResult.status,
      error: proResult.error || flashResult.error,
    };

    if (!pass1Result.ok) {
      if (pass1Result.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    let pass2Attempted = false;
    if (validAddresses.length === 0 && !parsed.tokenName && !parsed.tokenSymbol && parsed.truncatedFragments.length === 0) {
      pass2Attempted = true;
      const pass2Result = await callGemini(GEMINI_API_KEY, "gemini-3.1-pro-preview", ENHANCED_SYSTEM_PROMPT, ENHANCED_USER_PROMPT, imageInline, 800, 0.2);

      if (pass2Result.ok) {
        const pass2Content = pass2Result.text || "";
        const pass2Parsed = parseVLMResponse(pass2Content);
        const pass2Processed = processAddresses(pass2Parsed.rawAddresses);

        for (const p of pass2Processed.processedAddresses) {
          const key = p.corrected.toLowerCase();
          const existing = addressMap.get(key);
          if (!existing || p.confidence > existing.confidence) addressMap.set(key, p);
        }
        processedAddresses = Array.from(addressMap.values());
        validAddresses = processedAddresses.filter((p) => p.confidence >= 0.5).map((p) => p.corrected);
        totalCorrections = processedAddresses.reduce((s, p) => s + p.corrections.length, 0);
        if (pass2Processed.validAddresses.length > 0) content = pass2Content;

        if (!parsed.tokenName && pass2Parsed.tokenName) parsed.tokenName = pass2Parsed.tokenName;
        if (!parsed.tokenSymbol && pass2Parsed.tokenSymbol) parsed.tokenSymbol = pass2Parsed.tokenSymbol;
        if (parsed.truncatedFragments.length === 0 && pass2Parsed.truncatedFragments.length > 0) {
          parsed.truncatedFragments = pass2Parsed.truncatedFragments;
        }
      }
    }

    let pass3Attempted = false;
    if (validAddresses.length === 0 && !parsed.tokenName && !parsed.tokenSymbol && parsed.truncatedFragments.length === 0) {
      pass3Attempted = true;
      const pass3Result = await callGemini(GEMINI_API_KEY, "gemini-3.1-pro-preview", PIXEL_LEVEL_SYSTEM_PROMPT, PIXEL_LEVEL_USER_PROMPT, imageInline, 1000, 0.3);

      if (pass3Result.ok) {
        const pass3Content = pass3Result.text || "";
        const pass3Parsed = parseVLMResponse(pass3Content);
        const pass3Processed = processAddresses(pass3Parsed.rawAddresses);

        for (const p of pass3Processed.processedAddresses) {
          const key = p.corrected.toLowerCase();
          const existing = addressMap.get(key);
          if (!existing || p.confidence > existing.confidence) addressMap.set(key, p);
        }
        processedAddresses = Array.from(addressMap.values());
        validAddresses = processedAddresses.filter((p) => p.confidence >= 0.5).map((p) => p.corrected);
        totalCorrections = processedAddresses.reduce((s, p) => s + p.corrections.length, 0);
        if (pass3Processed.validAddresses.length > 0) content = pass3Content;

        if (!parsed.tokenName && pass3Parsed.tokenName) parsed.tokenName = pass3Parsed.tokenName;
        if (!parsed.tokenSymbol && pass3Parsed.tokenSymbol) parsed.tokenSymbol = pass3Parsed.tokenSymbol;
        if (parsed.truncatedFragments.length === 0 && pass3Parsed.truncatedFragments.length > 0) {
          parsed.truncatedFragments = pass3Parsed.truncatedFragments;
        }
      }
    }

    const passCount = pass3Attempted ? 3 : (pass2Attempted ? 2 : 1);
    const modelUsed = pass3Attempted
      ? "gemini-3.1-pro+3.8-flash(parallel)+3.1-pro-forensic+3.1-pro-pixel"
      : (pass2Attempted ? "gemini-3.1-pro+3.8-flash(parallel)+3.1-pro-forensic" : "gemini-3.1-pro+3.8-flash(parallel)");

    const addressConfidences = validAddresses.map((addr) => {
      const p = addressMap.get(addr.toLowerCase());
      return p ? Math.round(p.confidence * 100) : 50;
    });

    return new Response(JSON.stringify({
      addresses: validAddresses,
      addressConfidences,
      raw: content,
      tokenName: parsed.tokenName || null,
      tokenSymbol: parsed.tokenSymbol || null,
      truncatedAddresses: parsed.truncatedFragments.length > 0 ? parsed.truncatedFragments : null,
      corrections: { applied: totalCorrections > 0, count: totalCorrections, details: processedAddresses },
      metadata: { model: modelUsed, passes: passCount, parallel: true }
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("[ocr-extract] Error:", error);
    const origin = req.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    return new Response(JSON.stringify({ error: "An error occurred processing your request" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
