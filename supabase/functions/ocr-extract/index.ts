import { createClient } from "npm:@supabase/supabase-js@2";

// ---------- Gemini model config (override via Supabase secrets) ----------
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.8-flash";
const GEMINI_PRO_MODEL = Deno.env.get("GEMINI_OCR_PRO_MODEL") || "gemini-3.1-pro-preview";
const GEMINI_FALLBACK_MODEL = Deno.env.get("GEMINI_FALLBACK_MODEL") || "gemini-3.6-flash";

// ---------- On-chain verification config ----------
// Optional secret. A dedicated RPC (Helius, QuickNode...) is more reliable than the public one.
const SOLANA_RPC_URL = Deno.env.get("SOLANA_RPC_URL") || "https://api.mainnet-beta.solana.com";
const VERIFY_TIMEOUT_MS = 4000;
const MAX_VERIFY = 6;

// ---------- Daily OCR quotas (UTC day) ----------
const WEB_DAILY_LIMIT_PER_IP = 3;
const TELEGRAM_DAILY_LIMIT_PER_USER = 5;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const IP_HASH_SALT = Deno.env.get("OCR_IP_SALT") || SERVICE_ROLE_KEY;

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

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_RETRIES = 2;
const RETRY_DELAYS = [1000, 2500];

function safeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function sha256Hex(input) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getClientIp(req) {
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return '';
}

// Decides who is being counted and what their daily limit is.
// Telegram identity is only trusted when the caller proves it is our own backend
// (service role key); otherwise anyone could spoof a Telegram user id.
async function resolveQuotaSubject(req, authHeader, body) {
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const isServiceCall = !!SERVICE_ROLE_KEY && safeEqual(bearer, SERVICE_ROLE_KEY);

  if (isServiceCall && body && body.telegramUserId !== undefined && body.telegramUserId !== null) {
    const tgId = String(body.telegramUserId);
    if (/^\d{1,20}$/.test(tgId)) {
      return { identifier: `tg:${tgId}`, limit: TELEGRAM_DAILY_LIMIT_PER_USER };
    }
  }

  const ip = getClientIp(req) || 'unknown';
  const ipHash = await sha256Hex(`${IP_HASH_SALT}:${ip}`);
  return { identifier: `ip:${ipHash.slice(0, 32)}`, limit: WEB_DAILY_LIMIT_PER_IP };
}

const CHAR_CORRECTIONS = {
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
const BASE58_CLASS = '[1-9A-HJ-NP-Za-km-z]';
// A repaired address may differ from what the model read by at most this many
// characters. More than that is a guess, and a guessed address can belong to a
// different token, so it is rejected instead of scanned.
const MAX_REPAIRS = 2;

function applyBasicCorrections(text) {
  let result = '';
  let fixes = 0;
  let dropped = 0;
  for (const char of text) {
    if (HEX_CHARS.has(char)) {
      result += char;
    } else if (CHAR_CORRECTIONS[char]) {
      result += CHAR_CORRECTIONS[char];
      fixes++;
    } else {
      dropped++;
    }
  }
  return { text: result, fixes, dropped };
}

function correctEthAddress(rawAddress) {
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

  const { text: fixedBody, fixes, dropped } = applyBasicCorrections(body);

  // Only accept a repair when nothing was thrown away, the length comes out
  // exactly right and only a couple of look-alike characters were swapped.
  if (dropped === 0 && fixes > 0 && fixes <= MAX_REPAIRS && /^[a-fA-F0-9]{40}$/.test(fixedBody)) {
    return {
      corrected: '0x' + fixedBody.toLowerCase(),
      confidence: Math.max(0.5, 1 - fixes * 0.15),
      corrections: [`${fixes} character(s) corrected`],
      type: 'ethereum',
    };
  }

  // No padding or truncating: never fabricate an address.
  return {
    corrected: prefix + body.toLowerCase(),
    confidence: 0,
    corrections: ['Could not repair safely'],
    type: 'ethereum',
  };
}

function correctSolanaAddress(rawAddress) {
  const corrections = [];
  const BASE58_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const BASE58_SET = new Set(BASE58_CHARS);
  const SOLANA_CORRECTIONS = {
    '0': 'o', 'O': 'o', 'I': '1', 'l': '1',
  };

  let corrected = '';
  let changesCount = 0;
  let dropped = 0;
  for (const char of rawAddress) {
    if (BASE58_SET.has(char)) {
      corrected += char;
    } else if (SOLANA_CORRECTIONS[char]) {
      corrected += SOLANA_CORRECTIONS[char];
      changesCount++;
    } else {
      dropped++;
    }
  }

  if (changesCount > 0) {
    corrections.push(`${changesCount} invalid Base58 character(s) corrected`);
  }

  const isValidLength = corrected.length >= 32 && corrected.length <= 44;
  const safe = isValidLength && dropped === 0 && changesCount <= MAX_REPAIRS;
  const confidence = safe ? Math.max(0.5, 1 - (changesCount * 0.15)) : 0.2;
  return { corrected, confidence, corrections, type: 'solana' };
}

function correctTronAddress(rawAddress) {
  const corrections = [];
  let normalized = rawAddress;
  if (!normalized.startsWith('T')) {
    if (normalized.startsWith('t')) {
      normalized = 'T' + normalized.slice(1);
      corrections.push('Lowercase t corrected to T');
    } else {
      return { corrected: rawAddress, confidence: 0, corrections: ['Invalid Tron address'], type: 'tron' };
    }
  }

  // Capital O and zero are not Base58; lowercase o is.
  const TRON_CORRECTIONS = { '0': 'o', 'O': 'o', 'I': '1', 'l': '1' };
  const base58Re = new RegExp(`^${BASE58_CLASS}$`);
  let corrected = 'T';
  let changesCount = 0;
  let dropped = 0;
  for (let i = 1; i < normalized.length; i++) {
    const char = normalized[i];
    if (base58Re.test(char)) {
      corrected += char;
    } else if (TRON_CORRECTIONS[char]) {
      corrected += TRON_CORRECTIONS[char];
      changesCount++;
    } else {
      dropped++;
    }
  }

  if (changesCount > 0) {
    corrections.push(`${changesCount} character(s) corrected`);
  }

  const isValidLength = corrected.length === 34;
  const safe = isValidLength && dropped === 0 && changesCount <= MAX_REPAIRS;
  const confidence = safe ? Math.max(0.5, 1 - (changesCount * 0.15)) : 0.2;
  return { corrected, confidence, corrections, type: 'tron' };
}

function correctAddress(rawAddress) {
  const trimmed = rawAddress.trim();
  if (/^[0O]x/i.test(trimmed)) return correctEthAddress(trimmed);

  // Already valid Base58: classify without touching it. A Solana address can
  // legitimately start with T, so only a 34-char T-address is treated as Tron.
  if (/^[1-9A-HJ-NP-Za-km-z]+$/.test(trimmed)) {
    if (trimmed.length === 34 && trimmed.startsWith('T')) {
      return { corrected: trimmed, confidence: 1.0, corrections: [], type: 'tron' };
    }
    if (trimmed.length >= 32 && trimmed.length <= 44) {
      return { corrected: trimmed, confidence: 1.0, corrections: [], type: 'solana' };
    }
  }

  if ((trimmed.startsWith('T') || trimmed.startsWith('t')) && trimmed.length >= 30 && trimmed.length <= 38) {
    return correctTronAddress(trimmed);
  }
  if (trimmed.length >= 32 && trimmed.length <= 50) {
    const result = correctSolanaAddress(trimmed);
    if (result.confidence > 0.3) return result;
  }
  return { type: 'unknown', corrected: trimmed, confidence: 0, corrections: ['Unable to determine address type'] };
}

// EVM addresses are case-insensitive. Solana and Tron addresses are NOT: two
// strings that differ only by case are two different addresses.
function addrKey(addr) {
  return addr.startsWith('0x') ? addr.toLowerCase() : addr;
}

function parseDataUrl(input) {
  const match = input.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]*)$/);
  if (match) return { mimeType: match[1], data: match[2] };
  return { mimeType: 'image/png', data: input };
}

// ---------- On-chain verification ----------
// Solana addresses have no checksum, so a misread character still produces a
// perfectly valid-looking address. Only checking that it exists catches that.
async function fetchJsonWithTimeout(url, init) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), VERIFY_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...(init || {}), signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch (_e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// true = has trading pairs, false = DexScreener knows nothing, null = lookup failed
async function dexHasPairs(addr) {
  const data = await fetchJsonWithTimeout(`https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(addr)}`);
  if (!data) return null;
  return Array.isArray(data.pairs) && data.pairs.length > 0;
}

// true = account exists, false = does not exist, null = lookup failed
async function solanaAccountExists(addr) {
  const data = await fetchJsonWithTimeout(SOLANA_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getAccountInfo',
      params: [addr, { encoding: 'base64', dataSlice: { offset: 0, length: 0 } }],
    }),
  });
  if (!data || data.error || !data.result) return null;
  return data.result.value !== null && data.result.value !== undefined;
}

// Returns 'verified' | 'not_found' | 'unknown'.
// 'not_found' is only ever returned for Solana, where a token mint must exist as an account.
// For other chains a failed lookup proves nothing, so it stays 'unknown'.
async function verifyAddress(addr, type) {
  if (type === 'solana') {
    const exists = await solanaAccountExists(addr);
    if (exists === true) return 'verified';
    if (exists === false) return 'not_found';
    const pairs = await dexHasPairs(addr);
    return pairs === true ? 'verified' : 'unknown';
  }
  if (type === 'ethereum') {
    const pairs = await dexHasPairs(addr);
    return pairs === true ? 'verified' : 'unknown';
  }
  return 'unknown';
}

// Turns raw candidates into final addresses with honest confidence:
//  - exists on-chain            -> 95-100%
//  - not found on Solana        -> dropped (almost certainly a misread)
//  - both models agree          -> up to 85%
//  - only one model, no proof   -> up to 60%
//  - models disagree, no proof  -> up to 40% (user must confirm)
async function finalizeCandidates(addressMap, hits, ran) {
  const bothRan = ran.has('pro') && ran.has('flash');
  const plausible = Array.from(addressMap.entries()).filter(([, p]) => p.confidence >= 0.5);

  // Which address types each model returned, used to detect disagreement
  const typesBySource = { pro: new Set(), flash: new Set() };
  for (const [key, p] of plausible) {
    const srcs = hits.get(key) || new Set();
    if (srcs.has('pro')) typesBySource.pro.add(p.type);
    if (srcs.has('flash')) typesBySource.flash.add(p.type);
  }

  // Verify the most promising candidates only, to bound latency and external calls
  const toVerify = plausible
    .sort((a, b) => ((hits.get(b[0])?.size || 0) - (hits.get(a[0])?.size || 0)) || (b[1].confidence - a[1].confidence))
    .slice(0, MAX_VERIFY);

  const verification = new Map();
  await Promise.all(toVerify.map(async ([key, p]) => {
    verification.set(key, await verifyAddress(p.corrected, p.type));
  }));

  const results = [];
  for (const [key, p] of addressMap.entries()) {
    const srcs = hits.get(key) || new Set();
    const fromPro = srcs.has('pro');
    const fromFlash = srcs.has('flash');
    const agreed = fromPro && fromFlash;
    const otherSet = fromPro && !fromFlash ? typesBySource.flash : (fromFlash && !fromPro ? typesBySource.pro : null);
    const conflict = bothRan && !agreed && otherSet !== null && otherSet.has(p.type);
    const check = verification.get(key); // undefined when not checked

    let conf;
    let status;
    if (check === 'verified') {
      conf = agreed ? 1.0 : 0.95;
      status = 'verified';
    } else if (check === 'not_found') {
      conf = 0.2;
      status = 'not_found';
    } else if (p.confidence < 0.5) {
      conf = p.confidence;
      status = 'unverified';
    } else if (agreed) {
      conf = Math.min(p.confidence, 0.85);
      status = 'unverified';
    } else if (conflict) {
      conf = Math.min(p.confidence, 0.4);
      status = 'conflict';
    } else {
      conf = Math.min(p.confidence, 0.6);
      status = 'unverified';
    }

    results.push({ ...p, key, confidence: conf, status });
  }

  // Drop junk, proven misreads, and conflicting guesses next to a verified address of the same type
  const verifiedTypes = new Set(results.filter((r) => r.status === 'verified').map((r) => r.type));
  let kept = results.filter((r) => r.confidence >= 0.3);
  kept = kept.filter((r) => !(r.status === 'conflict' && verifiedTypes.has(r.type)));

  // Drop fragments that are just part of a longer kept address (wrapped lines)
  kept = kept.filter((r) =>
    !kept.some((o) => o !== r && o.corrected.length > r.corrected.length && r.corrected.length >= 20 && o.corrected.includes(r.corrected))
  );

  kept.sort((a, b) => b.confidence - a.confidence);

  return {
    addresses: kept.map((r) => r.corrected),
    addressConfidences: kept.map((r) => Math.round(r.confidence * 100)),
    addressStatuses: kept.map((r) => r.status),
    needsConfirmation: kept.length === 0 || kept[0].status !== 'verified',
    details: kept.map((r) => ({
      original: r.original,
      corrected: r.corrected,
      type: r.type,
      confidence: r.confidence,
      corrections: r.corrections,
      status: r.status,
    })),
    totalCorrections: kept.reduce((s, r) => s + r.corrections.length, 0),
  };
}

// Calls Gemini. Retries 5xx on the same model, and if the model is retired (404)
// or keeps failing with 5xx, makes one attempt with the fallback model.
async function callGemini(apiKey, model, systemPrompt, userText, imageInline, maxTokens, temperature, attempt = 0, triedFallback = false) {
  const canFallback = !triedFallback && !!GEMINI_FALLBACK_MODEL && model !== GEMINI_FALLBACK_MODEL;
  try {
    const parts = [{ text: userText }];
    if (imageInline) {
      parts.push({ inline_data: { mime_type: imageInline.mimeType, data: imageInline.data } });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts }],
          generationConfig: { maxOutputTokens: maxTokens, temperature },
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
      return { ok: true, status: response.status, text };
    }

    if (response.status === 429) {
      return { ok: false, status: response.status, error: `Status ${response.status}` };
    }

    // Model retired / not found: go straight to the fallback model
    if (response.status === 404 && canFallback) {
      console.warn(`[ocr-extract] model ${model} returned 404, falling back to ${GEMINI_FALLBACK_MODEL}`);
      return callGemini(apiKey, GEMINI_FALLBACK_MODEL, systemPrompt, userText, imageInline, maxTokens, temperature, 0, true);
    }

    if (attempt < MAX_RETRIES && response.status >= 500) {
      const delay = RETRY_DELAYS[attempt] || 2500;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return callGemini(apiKey, model, systemPrompt, userText, imageInline, maxTokens, temperature, attempt + 1, triedFallback);
    }

    // Retries exhausted on a server error: one last try with the fallback model
    if (response.status >= 500 && canFallback) {
      console.warn(`[ocr-extract] model ${model} kept failing with ${response.status}, falling back to ${GEMINI_FALLBACK_MODEL}`);
      return callGemini(apiKey, GEMINI_FALLBACK_MODEL, systemPrompt, userText, imageInline, maxTokens, temperature, 0, true);
    }

    const errorText = await response.text().catch(() => 'Unknown error');
    console.error(`[ocr-extract] Gemini error: ${response.status} - ${errorText}`);
    return { ok: false, status: response.status, error: errorText };
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      const delay = RETRY_DELAYS[attempt] || 2500;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return callGemini(apiKey, model, systemPrompt, userText, imageInline, maxTokens, temperature, attempt + 1, triedFallback);
    }
    return { ok: false, status: 0, error: err instanceof Error ? err.message : 'Network error' };
  }
}

const PRIMARY_SYSTEM_PROMPT = `You are a specialized blockchain contract address and token info extractor.

SUPPORTED ADDRESS FORMATS:
- Ethereum/EVM: 0x followed by EXACTLY 40 hex characters (0-9, a-f, A-F)
  Example: 0x6982508145454Ce325dDbE47a25d4ec3d2311933
- Solana: Base58 encoded, 32-44 characters (no 0, O, I, l)
  Example: So11111111111111111111111111111112
- Tron: T followed by 33 Base58 characters (no 0, O, I, l)
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
   - 9 (nine) vs g vs q
   - f vs t, T vs i1
   Solana and Tron addresses can NEVER contain 0 (zero), O (capital o), I (capital i) or l (lowercase L).
3. The address MUST be exactly the right length (40 hex chars for ETH after 0x)
4. If an address wraps across two or more lines, JOIN the lines into ONE address. Never output the second line as a separate address.
5. EXTRACT ALL ADDRESSES VISIBLE — do not stop after the first one. A screenshot
   may contain multiple tokens (lists, comparisons, swap pairs, portfolio views).
6. Return results in this EXACT format (one item per line):
   - Full valid addresses: just the address on its own line
   - If an address is TRUNCATED (shows "..." or "…" or only shows start and end), output: TRUNCATED:visible_start...visible_end
   - Token name if visible: TOKEN_NAME:the_token_name
   - Token symbol if visible: TOKEN_SYMBOL:the_symbol
   - Blockchain network if visible anywhere (a network tab, chain badge, or label such as BSC, BNB Chain, Ethereum, Solana, Base, Polygon, Arbitrum, Optimism, Avalanche, Tron): NETWORK:the_network_name
7. If you see "contract:" or similar labels, the address follows it
8. If no addresses AND no token info found, return "NONE"
9. Do NOT include explanations, markdown, or formatting

EXAMPLE OUTPUT for a screenshot showing "SUBHUB" token on BSC with truncated address "0x9efd...25068c":
TOKEN_NAME:SUBHUB
TOKEN_SYMBOL:SUBHUB
NETWORK:BSC
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
4. Cross-check ambiguous characters using context (hex addresses only use 0-9 and a-f; Solana and Tron addresses never contain 0, O, I or l)
5. If an address wraps across lines, join the lines into ONE address
6. Verify the address length is correct before outputting

SUPPORTED FORMATS:
- Ethereum/EVM: 0x + exactly 40 hex chars → Example: 0x6982508145454Ce325dDbE47a25d4ec3d2311933
- Solana: Base58, 32-44 chars (excludes 0, O, I, l) → Example: So11111111111111111111111111111112
- Tron: T + 33 Base58 chars → Example: T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb

COMMON OCR TRAPS TO AVOID:
- "rn" can look like "m" → read carefully
- "cl" can look like "d" → verify
- f vs t, T vs i1, 9 vs o, 5 vs S, 8 vs B
- Dark mode screenshots may have inverted contrast
- Small/low-res text needs extra care on hex chars

OUTPUT FORMAT (one per line, no markdown, no explanation):
- Full address: the address itself
- Truncated: TRUNCATED:visible_start...visible_end
- Token name: TOKEN_NAME:name
- Token symbol: TOKEN_SYMBOL:symbol
- Network, if a chain name or badge is visible (BSC, Ethereum, Solana, Base, ...): NETWORK:name
- Nothing found: NONE`;

const USER_PROMPT = "Extract all contract addresses and token info from this screenshot. Include full addresses, truncated address fragments (with TRUNCATED: prefix), any visible token name (TOKEN_NAME:) and symbol (TOKEN_SYMBOL:), and the blockchain network if shown (NETWORK:).";

const ENHANCED_USER_PROMPT = "I need you to very carefully extract contract addresses from this image. The previous attempt found nothing - please look harder at every part of the image. Check headers, footers, sidebars, small text, QR codes, and any data fields. Even partial or truncated addresses are useful. Also extract any token name, symbol, or blockchain network visible.";

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
- An address wrapped across lines is ONE address

OUTPUT FORMAT (one per line, no markdown, no explanation):
- RAW_TEXT:the_raw_transcribed_text (for each text block found)
- Full valid address on its own line
- TRUNCATED:visible_start...visible_end
- TOKEN_NAME:name
- TOKEN_SYMBOL:symbol
- NETWORK:name (if a blockchain network name is visible)
- NONE if absolutely nothing found`;

const PIXEL_LEVEL_USER_PROMPT = "Two previous AI passes failed to extract any addresses from this image. Perform a pixel-by-pixel analysis: transcribe ALL visible alphanumeric text first as raw strings, then identify any blockchain addresses or token info within the transcribed text. Include even partial or low-confidence matches.";

// Maps whatever network text the model saw to a stable lowercase key
function normalizeNetwork(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase().trim();
  if (!s) return null;
  if (/\b(bsc|bnb|binance)\b/.test(s)) return 'bsc';
  if (/\b(eth|ethereum)\b/.test(s)) return 'ethereum';
  if (/\b(sol|solana)\b/.test(s)) return 'solana';
  if (/\b(polygon|matic|pol)\b/.test(s)) return 'polygon';
  if (/\barbitrum\b|\barb\b/.test(s)) return 'arbitrum';
  if (/\bbase\b/.test(s)) return 'base';
  if (/\boptimism\b|\bop\b/.test(s)) return 'optimism';
  if (/\b(avalanche|avax)\b/.test(s)) return 'avalanche';
  if (/\b(tron|trx)\b/.test(s)) return 'tron';
  return s.slice(0, 30);
}

function extractAddressesFromRawText(text) {
  const found = [];
  const ethMatches = text.match(/0x[a-fA-F0-9]{40}/g);
  if (ethMatches) found.push(...ethMatches);
  const solMatches = text.match(/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g);
  if (solMatches) found.push(...solMatches.filter(m => !m.startsWith('0x')));
  const tronMatches = text.match(/T[1-9A-HJ-NP-Za-km-z]{33}/g);
  if (tronMatches) found.push(...tronMatches);
  return found;
}

function parseVLMResponse(content) {
  const lines = content.split("\n").map((l) => l.trim()).filter((l) => l && l !== "NONE");

  const rawAddresses = [];
  const truncatedFragments = [];
  let tokenName = null;
  let tokenSymbol = null;
  let networkHint = null;

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
    if (cleaned.startsWith("NETWORK:")) {
      networkHint = normalizeNetwork(cleaned.replace("NETWORK:", "").trim());
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

  return { rawAddresses, truncatedFragments, tokenName, tokenSymbol, networkHint };
}

function processAddresses(rawAddresses) {
  const processedAddresses = [];
  const validAddresses = [];
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
      } else if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(corrected)) {
        validAddresses.push(corrected);
        totalCorrections += result.corrections.length;
      }
    }
  }

  return { validAddresses, processedAddresses, totalCorrections };
}

function jsonResponse(corsHeaders, status, payload) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse(corsHeaders, 401, { error: "Unauthorized" });
    }

    const body = await req.json();
    const { imageBase64 } = body || {};

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return jsonResponse(corsHeaders, 400, { error: "Invalid request format" });
    }

    if (imageBase64.length > MAX_IMAGE_SIZE) {
      return jsonResponse(corsHeaders, 400, { error: "Image too large. Maximum size is 10MB." });
    }

    if (!imageBase64.startsWith("data:image/") && !/^[A-Za-z0-9+/=]+$/.test(imageBase64)) {
      return jsonResponse(corsHeaders, 400, { error: "Invalid image format" });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("[ocr-extract] GEMINI_API_KEY not configured");
      return jsonResponse(corsHeaders, 503, { error: "Service temporarily unavailable" });
    }

    // ---------- Daily quota (checked only after cheap validation, before any paid call) ----------
    const subject = await resolveQuotaSubject(req, authHeader, body);
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: quotaRows, error: quotaError } = await adminClient.rpc('consume_ocr_quota', {
      p_identifier: subject.identifier,
      p_limit: subject.limit,
    });

    if (quotaError || !Array.isArray(quotaRows) || quotaRows.length === 0) {
      // Fail closed: if we cannot count, we do not spend AI credits.
      console.error("[ocr-extract] Quota check failed:", quotaError);
      return jsonResponse(corsHeaders, 503, { error: "Service temporarily unavailable" });
    }

    const quota = quotaRows[0];
    if (!quota.allowed) {
      console.warn(`[ocr-extract] Daily OCR limit reached for ${subject.identifier.split(':')[0]}`);
      return jsonResponse(corsHeaders, 429, {
        error: "ocr_daily_limit",
        message: `Daily screenshot-scan limit reached (${subject.limit} per day). Paste the contract address instead, or try again tomorrow.`,
        limit: subject.limit,
        used: quota.used,
      });
    }

    const imageInline = parseDataUrl(imageBase64);

    console.log(`[ocr-extract] Pass 1 (parallel): ${GEMINI_PRO_MODEL} + ${GEMINI_MODEL}`);

    // Token limits are generous because Gemini 3.x models can spend part of the
    // output budget on internal reasoning before writing the answer.
    const proCall = callGemini(GEMINI_API_KEY, GEMINI_PRO_MODEL, PRIMARY_SYSTEM_PROMPT, USER_PROMPT, imageInline, 2048, 0.1);
    const flashCall = callGemini(GEMINI_API_KEY, GEMINI_MODEL, PRIMARY_SYSTEM_PROMPT, USER_PROMPT, imageInline, 2048, 0.1);

    const [proResult, flashResult] = await Promise.all([proCall, flashCall]);

    const proContent = proResult.ok ? (proResult.text || "") : "";
    const flashContent = flashResult.ok ? (flashResult.text || "") : "";

    const proParsed = parseVLMResponse(proContent);
    const flashParsed = parseVLMResponse(flashContent);
    const proProcessed = processAddresses(proParsed.rawAddresses);
    const flashProcessed = processAddresses(flashParsed.rawAddresses);

    // Candidates keyed by address (case-sensitive for Solana/Tron), plus which
    // pass/model produced each one. Agreement between models drives confidence.
    const addressMap = new Map();
    const hits = new Map();
    const ran = new Set();
    const addCandidates = (processed, source) => {
      for (const p of processed.processedAddresses) {
        const key = addrKey(p.corrected);
        const existing = addressMap.get(key);
        if (!existing || p.confidence > existing.confidence) addressMap.set(key, p);
        if (!hits.has(key)) hits.set(key, new Set());
        hits.get(key).add(source);
      }
    };
    const hasPlausible = () => Array.from(addressMap.values()).some((p) => p.confidence >= 0.5);

    if (proResult.ok) { ran.add('pro'); addCandidates(proProcessed, 'pro'); }
    if (flashResult.ok) { ran.add('flash'); addCandidates(flashProcessed, 'flash'); }

    let parsed = {
      rawAddresses: [...proParsed.rawAddresses, ...flashParsed.rawAddresses],
      truncatedFragments: Array.from(new Set([...proParsed.truncatedFragments, ...flashParsed.truncatedFragments])),
      tokenName: proParsed.tokenName || flashParsed.tokenName,
      tokenSymbol: proParsed.tokenSymbol || flashParsed.tokenSymbol,
      networkHint: proParsed.networkHint || flashParsed.networkHint,
    };
    let content = proContent || flashContent;

    const pass1Result = {
      ok: proResult.ok || flashResult.ok,
      status: proResult.ok ? proResult.status : flashResult.status,
      error: proResult.error || flashResult.error,
    };

    if (!pass1Result.ok) {
      if (pass1Result.status === 429) {
        return jsonResponse(corsHeaders, 429, { error: "Too many requests. Please try again later." });
      }
    }

    let pass2Attempted = false;
    if (!hasPlausible() && !parsed.tokenName && !parsed.tokenSymbol && parsed.truncatedFragments.length === 0) {
      pass2Attempted = true;
      const pass2Result = await callGemini(GEMINI_API_KEY, GEMINI_PRO_MODEL, ENHANCED_SYSTEM_PROMPT, ENHANCED_USER_PROMPT, imageInline, 2048, 0.2);

      if (pass2Result.ok) {
        const pass2Content = pass2Result.text || "";
        const pass2Parsed = parseVLMResponse(pass2Content);
        const pass2Processed = processAddresses(pass2Parsed.rawAddresses);

        addCandidates(pass2Processed, 'pass2');
        if (pass2Processed.validAddresses.length > 0) content = pass2Content;

        if (!parsed.tokenName && pass2Parsed.tokenName) parsed.tokenName = pass2Parsed.tokenName;
        if (!parsed.tokenSymbol && pass2Parsed.tokenSymbol) parsed.tokenSymbol = pass2Parsed.tokenSymbol;
        if (!parsed.networkHint && pass2Parsed.networkHint) parsed.networkHint = pass2Parsed.networkHint;
        if (parsed.truncatedFragments.length === 0 && pass2Parsed.truncatedFragments.length > 0) {
          parsed.truncatedFragments = pass2Parsed.truncatedFragments;
        }
      }
    }

    let pass3Attempted = false;
    if (!hasPlausible() && !parsed.tokenName && !parsed.tokenSymbol && parsed.truncatedFragments.length === 0) {
      pass3Attempted = true;
      const pass3Result = await callGemini(GEMINI_API_KEY, GEMINI_PRO_MODEL, PIXEL_LEVEL_SYSTEM_PROMPT, PIXEL_LEVEL_USER_PROMPT, imageInline, 3000, 0.3);

      if (pass3Result.ok) {
        const pass3Content = pass3Result.text || "";
        const pass3Parsed = parseVLMResponse(pass3Content);
        const pass3Processed = processAddresses(pass3Parsed.rawAddresses);

        addCandidates(pass3Processed, 'pass3');
        if (pass3Processed.validAddresses.length > 0) content = pass3Content;

        if (!parsed.tokenName && pass3Parsed.tokenName) parsed.tokenName = pass3Parsed.tokenName;
        if (!parsed.tokenSymbol && pass3Parsed.tokenSymbol) parsed.tokenSymbol = pass3Parsed.tokenSymbol;
        if (!parsed.networkHint && pass3Parsed.networkHint) parsed.networkHint = pass3Parsed.networkHint;
        if (parsed.truncatedFragments.length === 0 && pass3Parsed.truncatedFragments.length > 0) {
          parsed.truncatedFragments = pass3Parsed.truncatedFragments;
        }
      }
    }

    // Verify on-chain and score by model agreement
    const final = await finalizeCandidates(addressMap, hits, ran);

    const passCount = pass3Attempted ? 3 : (pass2Attempted ? 2 : 1);
    const modelUsed = pass3Attempted
      ? `${GEMINI_PRO_MODEL}+${GEMINI_MODEL}(parallel)+${GEMINI_PRO_MODEL}-forensic+${GEMINI_PRO_MODEL}-pixel`
      : (pass2Attempted ? `${GEMINI_PRO_MODEL}+${GEMINI_MODEL}(parallel)+${GEMINI_PRO_MODEL}-forensic` : `${GEMINI_PRO_MODEL}+${GEMINI_MODEL}(parallel)`);

    console.log(`[ocr-extract] Final: ${final.addresses.length} kept (${final.addressStatuses.join(',')}), ${parsed.truncatedFragments.length} truncated, token: ${parsed.tokenName}/${parsed.tokenSymbol}, network: ${parsed.networkHint}, passes: ${passCount}`);

    return new Response(JSON.stringify({
      addresses: final.addresses,
      addressConfidences: final.addressConfidences,
      addressStatuses: final.addressStatuses,
      needsConfirmation: final.needsConfirmation,
      raw: content,
      tokenName: parsed.tokenName || null,
      tokenSymbol: parsed.tokenSymbol || null,
      networkHint: parsed.networkHint || null,
      truncatedAddresses: parsed.truncatedFragments.length > 0 ? parsed.truncatedFragments : null,
      corrections: { applied: final.totalCorrections > 0, count: final.totalCorrections, details: final.details },
      metadata: { model: modelUsed, passes: passCount, parallel: true }
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("[ocr-extract] Error:", error);
    const origin = req.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    return jsonResponse(corsHeaders, 500, { error: "An error occurred processing your request" });
  }
});
