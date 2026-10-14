import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://aidyor.app",
  "https://www.aidyor.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

function corsFor(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
}

const VALID_METHODS = ["vlm", "tesseract", "vlm_fallback_tesseract"] as const;
type Method = typeof VALID_METHODS[number];

const MAX_BODY_BYTES = 10_000;
const MAX_ADDRESS_LEN = 100;
const RATE_LIMIT = 30;        // requests per window per IP (best effort, per instance)
const RATE_WINDOW_MS = 60_000;

const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.resetAt < now) hits.delete(k);
  }
  const entry = hits.get(ip);
  if (!entry || entry.resetAt < now) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

// ---- Validation helpers ----
function bool(v: unknown): boolean {
  return v === true;
}
function intIn(v: unknown, min: number, max: number): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.min(max, Math.max(min, Math.round(v)));
}
function numIn(v: unknown, min: number, max: number): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.min(max, Math.max(min, v));
}
function str(v: unknown, maxLen: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (t.length === 0) return null;
  return t.slice(0, maxLen);
}

// ---- Accuracy metrics (inputs are length-capped, so cost is bounded) ----
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function calculateCER(extracted: string, groundTruth: string): number {
  if (!groundTruth) return 0;
  const distance = levenshteinDistance(extracted.toLowerCase(), groundTruth.toLowerCase());
  return Math.min(1, distance / groundTruth.length);
}

function calculateWER(extracted: string, groundTruth: string): number {
  if (!groundTruth) return 0;
  return extracted.toLowerCase() === groundTruth.toLowerCase() ? 0 : 1;
}

serve(async (req) => {
  const cors = corsFor(req.headers.get("origin"));
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    // ----- Rate limit -----
    const ip =
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      "unknown";
    if (rateLimited(ip)) {
      return json({ error: "Too many requests" }, 429);
    }

    // ----- Body size cap -----
    const declared = Number(req.headers.get("content-length") ?? "0");
    if (declared > MAX_BODY_BYTES) {
      return json({ error: "Payload too large" }, 413);
    }
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) {
      return json({ error: "Payload too large" }, 413);
    }

    let body: Record<string, unknown>;
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return json({ error: "Invalid payload" }, 400);
      }
      body = parsed as Record<string, unknown>;
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    // ----- Validate and sanitize -----
    if (!VALID_METHODS.includes(body.method as Method)) {
      return json({ error: "Invalid method" }, 400);
    }
    const method = body.method as Method;

    const addressesFound = intIn(body.addresses_found, 0, 1000) ?? 0;
    const addressesValidated = Math.min(intIn(body.addresses_validated, 0, 1000) ?? 0, addressesFound);
    const processingTimeMs = intIn(body.processing_time_ms, 0, 600_000) ?? 0;

    const groundTruth = str(body.ground_truth_address, MAX_ADDRESS_LEN);
    const extracted = str(body.extracted_address, MAX_ADDRESS_LEN);

    let cer: number | null = null;
    let wer: number | null = null;
    let exactMatch: boolean | null = null;
    if (groundTruth && extracted) {
      cer = calculateCER(extracted, groundTruth);
      wer = calculateWER(extracted, groundTruth);
      exactMatch = extracted.toLowerCase() === groundTruth.toLowerCase();
    }

    const record = {
      method,
      vlm_attempted: bool(body.vlm_attempted),
      vlm_succeeded: bool(body.vlm_succeeded),
      tesseract_attempted: bool(body.tesseract_attempted),
      tesseract_succeeded: bool(body.tesseract_succeeded),
      addresses_found: addressesFound,
      addresses_validated: addressesValidated,
      processing_time_ms: processingTimeMs,
      image_size_bytes: intIn(body.image_size_bytes, 0, 50_000_000),
      ground_truth_address: groundTruth,
      extracted_address: extracted,
      cer,
      wer,
      exact_match: exactMatch,
      error_type: str(body.error_type, 64),
      error_message: str(body.error_message, 300),
      confidence: numIn(body.confidence, 0, 100),
      char_count: intIn(body.char_count, 0, 1_000_000),
      raw_text_length: intIn(body.raw_text_length, 0, 1_000_000),
      fix_applied: bool(body.fix_applied),
    };

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error } = await supabase.from("ocr_analytics").insert(record);
    if (error) {
      console.error("[ocr-analytics] Insert error:", error);
      return json({ error: "Failed to log analytics" }, 500);
    }

    return json({ success: true });
  } catch (error) {
    console.error("[ocr-analytics] Error:", error);
    return json({ error: "Internal error" }, 500);
  }
});