export const DAILY_FREE_LIMIT = 3;
export const RETRY_DELAY_MS = 300;

const ALLOWED_ORIGINS = [
  "https://aidyor.app",
  "https://www.aidyor.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

export interface RpcError {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}
export interface RpcResult {
  data: unknown;
  error: RpcError | null;
}
export interface AuthUser {
  id: string;
  email: string | null;
}
export interface Deps {
  rpc(fn: string, args: Record<string, unknown>): Promise<RpcResult>;
  getUser(token: string): Promise<AuthUser | null>;
  isProSubscriber(email: string): Promise<boolean>;
  sha256Hex(input: string): Promise<string>;
  sleep(ms: number): Promise<void>;
  log(level: "info" | "warn" | "error", fields: Record<string, unknown>): void;
  keyKind: string; // "sb_secret" | "legacy_jwt" | "unknown" - never the key itself
  now(): number;
}

// ---------- logging safety ----------
export function redact(input: unknown): string {
  let s = typeof input === "string" ? input : String(input ?? "");
  s = s.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g, "[redacted-jwt]");
  s = s.replace(/sb_(secret|publishable)_[A-Za-z0-9_-]+/g, "sb_$1_[redacted]");
  s = s.replace(/\b(sk|rk|pk)_(live|test)_[A-Za-z0-9]+/g, "$1_$2_[redacted]");
  s = s.replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
  return s.length > 500 ? s.slice(0, 500) + "...[truncated]" : s;
}

export function keyKindOf(key: string | undefined | null): string {
  if (!key) return "unknown";
  if (key.startsWith("sb_secret_")) return "sb_secret";
  if (key.startsWith("eyJ")) return "legacy_jwt";
  return "unknown";
}

// ---------- error classification ----------
const TRANSIENT_CODES = new Set([
  "PGRST000", "PGRST001", "PGRST002", "PGRST003", "PGRST303", "CLIENT_EXCEPTION",
]);

// PostgREST rejects at the JWT gate, before any SQL runs, so retrying is safe
// even for the consuming RPC. Retry ONLY this exact case.
export function isIssuedAtFuture(e: RpcError | null): boolean {
  return !!e && e.code === "PGRST303" && /issued at future/i.test(e.message ?? "");
}

// ---------- CORS ----------
function corsFor(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
}

function getClientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip")?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown"
  );
}

type Op = "peek" | "consume";

export function createHandler(deps: Deps) {
  return async function handle(req: Request): Promise<Response> {
    const origin = req.headers.get("origin");
    const cors = corsFor(origin);
    const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { ...cors, "Content-Type": "application/json", ...extra },
      });

    if (req.method === "OPTIONS") return new Response(null, { headers: cors });

    const requestId =
      req.headers.get("sb-request-id") ?? req.headers.get("x-request-id") ??
      req.headers.get("cf-ray") ?? "unknown";

    // Returns the data, or a ready-made failure Response. Never a fake success.
    async function callRpc(
      op: Op, fn: string, args: Record<string, unknown>,
    ): Promise<{ ok: true; data: unknown } | { ok: false; res: Response }> {
      const maxAttempts = 2;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        let result: RpcResult;
        try {
          result = await deps.rpc(fn, args);
        } catch (e) {
          result = { data: null, error: { code: "CLIENT_EXCEPTION", message: redact((e as Error)?.message) } };
        }
        if (!result.error) return { ok: true, data: result.data };

        const err = result.error;
        const retry = isIssuedAtFuture(err) && attempt < maxAttempts;
        deps.log(retry ? "warn" : "error", {
          event: "scan_limit_rpc_failed",
          op, rpc: fn, attempt, will_retry: retry,
          code: err.code ?? null,
          message: redact(err.message),
          details: err.details == null ? null : redact(err.details),
          hint: err.hint == null ? null : redact(err.hint),
          key_kind: deps.keyKind,       // type only, never the value
          fn_clock_iso: new Date(deps.now()).toISOString(), // compare with PostgREST/DB clock
          request_id: requestId,
        });
        if (retry) { await deps.sleep(RETRY_DELAY_MS); continue; }

        const transient = TRANSIENT_CODES.has(err.code ?? "");
        return {
          ok: false,
          res: transient
            ? json({ error: "Scan limit check temporarily unavailable", code: "SCAN_LIMIT_UNAVAILABLE", retryable: true }, 503, { "Retry-After": "2" })
            : json({ error: "Could not verify scan limit", code: "SCAN_LIMIT_ERROR", retryable: false }, 500),
        };
      }
      // unreachable
      return { ok: false, res: json({ error: "Internal error" }, 500) };
    }

    try {
      let peek = false;
      try {
        const body = await req.json();
        peek = body?.peek === true;
      } catch (_e) { /* no body / invalid JSON: normal consuming flow */ }
      const op: Op = peek ? "peek" : "consume";

      const authHeader = req.headers.get("Authorization") ?? "";
      let userId: string | null = null;
      let userEmail: string | null = null;
      if (authHeader.startsWith("Bearer ")) {
        const user = await deps.getUser(authHeader.replace("Bearer ", ""));
        if (user) { userId = user.id; userEmail = user.email ?? null; }
      }

      if (userId && userEmail) {
        try {
          if (await deps.isProSubscriber(userEmail)) {
            return json({ allowed: true, remaining: -1, isPro: true });
          }
        } catch (e) {
          deps.log("error", { event: "stripe_check_failed", message: redact((e as Error)?.message), request_id: requestId });
        }
      }

      const identifier = userId ? `user:${userId}` : `ip:${getClientIp(req)}`;
      const finalIdentifier = identifier.startsWith("ip:")
        ? "ip:" + (await deps.sha256Hex(identifier))
        : identifier;
      const args = { p_identifier: finalIdentifier, p_daily_limit: DAILY_FREE_LIMIT };

      if (peek) {
        // STRICTLY READ-ONLY: only get_remaining_free_scans is ever called here.
        const r = await callRpc("peek", "get_remaining_free_scans", args);
        if (!r.ok) return r.res;
        const row = Array.isArray(r.data) ? (r.data[0] as { remaining?: unknown } | undefined) : undefined;
        if (!row || !Number.isInteger(row.remaining)) {
          deps.log("error", { event: "scan_limit_invalid_response", op, rpc: "get_remaining_free_scans", request_id: requestId });
          return json({ error: "Could not verify scan limit", code: "SCAN_LIMIT_ERROR", retryable: false }, 500);
        }
        const remaining = row.remaining as number;
        return json({ allowed: remaining > 0, remaining, isPro: false });
      }

      const r = await callRpc("consume", "check_and_increment_free_scan", args);
      if (!r.ok) return r.res;
      const row = Array.isArray(r.data) ? (r.data[0] as { allowed?: unknown; remaining?: unknown } | undefined) : undefined;
      if (!row || typeof row.allowed !== "boolean" || !Number.isInteger(row.remaining)) {
        deps.log("error", { event: "scan_limit_invalid_response", op, rpc: "check_and_increment_free_scan", request_id: requestId });
        return json({ error: "Could not verify scan limit", code: "SCAN_LIMIT_ERROR", retryable: false }, 500);
      }
      return json({ allowed: row.allowed, remaining: row.remaining as number, isPro: false });
    } catch (e) {
      deps.log("error", { event: "scan_limit_unhandled", message: redact((e as Error)?.message), request_id: requestId });
      return json({ error: "Internal error" }, 500);
    }
  };
}
