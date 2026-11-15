// Run: node --experimental-strip-types --test handler.test.ts   (Node >= 22.6)
// or:  deno test handler.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHandler, DAILY_FREE_LIMIT, redact } from "./handler.ts";
import type { Deps, RpcResult, AuthUser } from "./handler.ts";

// ---- fake JWT helpers (unsigned; only the claims matter for the fake gateway) ----
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
const fakeJwt = (claims: Record<string, unknown>) => `eyJ${b64({ alg: "HS256" }).slice(3)}.${b64(claims)}.c2ln`;

// ---- fake backend mirroring the real SQL semantics ----
function makeBackend(opts: {
  failures?: RpcResult[];          // consumed in order, one per rpc call, before normal behavior
  gatewayClockSkewSec?: number;    // PostgREST clock behind real time (stale cache bug)
  serviceJwt?: string;             // when set, gateway validates it like PostgREST does
  nowMs?: number;
} = {}) {
  const usage = new Map<string, number>();
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  const failures = [...(opts.failures ?? [])];
  const now = opts.nowMs ?? Date.now();

  const rpc: Deps["rpc"] = async (fn, args) => {
    calls.push({ fn, args });
    if (opts.serviceJwt) {
      const claims = JSON.parse(Buffer.from(opts.serviceJwt.split(".")[1], "base64url").toString());
      const gatewayNow = now / 1000 - (opts.gatewayClockSkewSec ?? 0);
      if (claims.iat > gatewayNow + 30) // PostgREST's fixed 30 s iat tolerance
        return { data: null, error: { code: "PGRST303", message: "JWT issued at future", details: null, hint: null } };
      if (claims.exp <= gatewayNow || claims.role !== "service_role")
        return { data: null, error: { code: "PGRST301", message: "JWT invalid", details: null, hint: null } };
    }
    const f = failures.shift();
    if (f) return f;
    const id = args.p_identifier as string;
    const limit = args.p_daily_limit as number;
    const count = usage.get(id);
    if (fn === "get_remaining_free_scans") {
      return { data: [{ remaining: count == null ? limit : Math.max(0, limit - count) }], error: null };
    }
    if (fn === "check_and_increment_free_scan") {
      const c = count ?? 0;
      if (c >= limit) return { data: [{ allowed: false, remaining: 0 }], error: null };
      usage.set(id, c + 1);
      return { data: [{ allowed: true, remaining: limit - c - 1 }], error: null };
    }
    throw new Error("unexpected rpc " + fn);
  };
  return { rpc, usage, calls };
}

function makeDeps(backend: ReturnType<typeof makeBackend>, over: Partial<Deps> = {}) {
  const logs: { level: string; fields: Record<string, unknown> }[] = [];
  const sleeps: number[] = [];
  const deps: Deps = {
    rpc: backend.rpc,
    getUser: async () => null,
    isProSubscriber: async () => false,
    sha256Hex: async (s) => "H(" + s + ")",
    sleep: async (ms) => { sleeps.push(ms); },
    log: (level, fields) => logs.push({ level, fields }),
    keyKind: "sb_secret",
    now: () => Date.now(),
    ...over,
  };
  return { deps, logs, sleeps };
}

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("https://x.test/functions/v1/check-scan-limit", {
    method: "POST",
    headers: { origin: "https://aidyor.app", "cf-connecting-ip": "203.0.113.9", ...headers },
    body: JSON.stringify(body),
  });
const read = async (r: Response) => ({ status: r.status, body: await r.json() });

const USER: AuthUser = { id: "u-123", email: "a@b.test" };

// 1. Anonymous visitor can check remaining scans
test("anonymous peek returns full allowance, hashed IP identifier", async () => {
  const be = makeBackend(); const { deps } = makeDeps(be);
  const r = await read(await createHandler(deps)(post({ peek: true })));
  assert.deepEqual(r, { status: 200, body: { allowed: true, remaining: DAILY_FREE_LIMIT, isPro: false } });
  assert.equal(be.calls[0].args.p_identifier, "ip:H(ip:203.0.113.9)");
});

// 2. Authenticated user can check remaining scans
test("authenticated peek uses user identifier", async () => {
  const be = makeBackend(); be.usage.set("user:u-123", 1);
  const { deps } = makeDeps(be, { getUser: async () => USER });
  const r = await read(await createHandler(deps)(post({ peek: true }, { authorization: "Bearer user.jwt.here" })));
  assert.deepEqual(r.body, { allowed: true, remaining: 2, isPro: false });
  assert.equal(be.calls[0].args.p_identifier, "user:u-123");
});

// 3. Peek does not increment scan usage
test("peek is strictly read-only (never calls consuming RPC, usage unchanged)", async () => {
  const be = makeBackend(); const { deps } = makeDeps(be); const h = createHandler(deps);
  for (let i = 0; i < 10; i++) await h(post({ peek: true }));
  assert.equal(be.calls.every((c) => c.fn === "get_remaining_free_scans"), true);
  assert.equal(be.usage.size, 0);
});

// 4. Normal scan consumption still works
test("consume decrements 3 -> 2 -> 1 -> 0 then denies", async () => {
  const be = makeBackend(); const { deps } = makeDeps(be); const h = createHandler(deps);
  const seen: unknown[] = [];
  for (let i = 0; i < 4; i++) seen.push((await read(await h(post({})))).body);
  assert.deepEqual(seen, [
    { allowed: true, remaining: 2, isPro: false },
    { allowed: true, remaining: 1, isPro: false },
    { allowed: true, remaining: 0, isPro: false },
    { allowed: false, remaining: 0, isPro: false },
  ]);
});

// 5a. Transient PGRST303 once -> single safe retry -> correct count
test("peek retries once on PGRST303 and returns the real count", async () => {
  const be = makeBackend({ failures: [{ data: null, error: { code: "PGRST303", message: "JWT issued at future" } }] });
  be.usage.set("ip:H(ip:203.0.113.9)", 2);
  const { deps, logs, sleeps } = makeDeps(be);
  const r = await read(await createHandler(deps)(post({ peek: true })));
  assert.deepEqual(r.body, { allowed: true, remaining: 1, isPro: false });
  assert.equal(be.calls.length, 2);
  assert.equal(sleeps.length, 1);
  assert.equal(logs[0].level, "warn");
  assert.equal(logs[0].fields.code, "PGRST303");
});

test("consume retries PGRST303 once and increments exactly once", async () => {
  const be = makeBackend({ failures: [{ data: null, error: { code: "PGRST303", message: "JWT issued at future" } }] });
  const { deps } = makeDeps(be);
  const r = await read(await createHandler(deps)(post({})));
  assert.deepEqual(r.body, { allowed: true, remaining: 2, isPro: false });
  assert.equal([...be.usage.values()][0], 1);
});

// 5b. Persistent failure -> never a misleading success
test("persistent PGRST303: 503, no allowed/remaining fields, error logged with diagnostics", async () => {
  const e: RpcResult = { data: null, error: { code: "PGRST303", message: "JWT issued at future", details: null, hint: null } };
  const be = makeBackend({ failures: [e, e] }); const { deps, logs } = makeDeps(be);
  const res = await createHandler(deps)(post({ peek: true }));
  const r = await read(res);
  assert.equal(r.status, 503);
  assert.equal(res.headers.get("Retry-After"), "2");
  assert.equal("remaining" in r.body, false);
  assert.equal("allowed" in r.body, false);
  assert.equal(r.body.retryable, true);
  const last = logs.at(-1)!;
  assert.equal(last.level, "error");
  for (const k of ["event", "op", "rpc", "attempt", "code", "message", "key_kind", "fn_clock_iso", "request_id"])
    assert.ok(k in last.fields, "missing log field " + k);
});

// 5c. Non-PGRST303 errors are NOT retried on the consuming path (avoid double count)
test("consume does not retry non-iat errors and does not change usage", async () => {
  const be = makeBackend({ failures: [{ data: null, error: { code: "PGRST002", message: "schema cache unavailable" } }] });
  const { deps } = makeDeps(be);
  const r = await read(await createHandler(deps)(post({})));
  assert.equal(r.status, 503);
  assert.equal(be.calls.length, 1);
  assert.equal(be.usage.size, 0);
});

test("non-transient DB error returns 500 (not 503)", async () => {
  const be = makeBackend({ failures: [{ data: null, error: { code: "42883", message: "function does not exist" } }] });
  const { deps } = makeDeps(be);
  assert.equal((await createHandler(deps)(post({ peek: true }))).status, 500);
});

test("thrown network error is handled as transient 503", async () => {
  const be = makeBackend(); const { deps } = makeDeps(be, { rpc: async () => { throw new Error("fetch failed"); } });
  assert.equal((await createHandler(deps)(post({ peek: true }))).status, 503);
});

test("empty RPC result is an error, NOT silently the full allowance", async () => {
  const be = makeBackend(); const { deps } = makeDeps(be, { rpc: async () => ({ data: [], error: null }) });
  const r = await read(await createHandler(deps)(post({ peek: true })));
  assert.equal(r.status, 500);
  assert.equal("remaining" in r.body, false);
});

// 6. Valid service-role JWT accepted; stale PostgREST clock reproduces the incident
test("valid service-role JWT is accepted by a correct-clock gateway", async () => {
  const now = Date.now();
  const jwt = fakeJwt({ role: "service_role", iss: "supabase", iat: Math.floor(now / 1000) - 5, exp: Math.floor(now / 1000) + 3600 });
  const be = makeBackend({ serviceJwt: jwt, nowMs: now }); const { deps } = makeDeps(be, { keyKind: "legacy_jwt" });
  const r = await read(await createHandler(deps)(post({ peek: true })));
  assert.equal(r.status, 200);
});

test("stale (>30s behind) PostgREST clock reproduces PGRST303 and fails safely, not as success", async () => {
  const now = Date.now();
  const jwt = fakeJwt({ role: "service_role", iss: "supabase", iat: Math.floor(now / 1000), exp: Math.floor(now / 1000) + 3600 });
  const be = makeBackend({ serviceJwt: jwt, nowMs: now, gatewayClockSkewSec: 60 });
  const { deps } = makeDeps(be);
  const r = await read(await createHandler(deps)(post({ peek: true })));
  assert.equal(r.status, 503);
  assert.equal(be.calls.length, 2); // original + one retry
});

// 7. No secrets / full JWTs in logs
test("logs never contain JWTs, sb_secret keys, bearer tokens or the caller's token", async () => {
  const userJwt = fakeJwt({ sub: "u-123", role: "authenticated", iat: 1, exp: 2 });
  const svcJwt = fakeJwt({ role: "service_role", iat: 1, exp: 2 });
  const leaky = `bad token ${svcJwt} key sb_secret_ABCDEF1234567890 Authorization: Bearer ${userJwt}`;
  const e: RpcResult = { data: null, error: { code: "PGRST303", message: leaky, details: leaky, hint: leaky } };
  const be = makeBackend({ failures: [e, e] });
  const { deps, logs } = makeDeps(be, {
    getUser: async () => USER,
    isProSubscriber: async () => { throw new Error("stripe boom " + svcJwt); },
  });
  await createHandler(deps)(post({ peek: true }, { authorization: `Bearer ${userJwt}` }));
  const dump = JSON.stringify(logs);
  assert.ok(logs.length >= 2);
  assert.equal(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\./.test(dump), false, "JWT leaked");
  assert.equal(dump.includes("sb_secret_ABCDEF1234567890"), false, "sb_secret leaked");
  assert.equal(dump.includes(userJwt), false, "caller token leaked");
  assert.equal(/Bearer\s+(?!\[redacted\])/i.test(dump), false, "bearer leaked");
});

test("redact() unit", () => {
  assert.equal(redact("x sb_secret_abc123 y"), "x sb_secret_[redacted] y");
  assert.equal(redact("k sk_live_ABC123"), "k sk_live_[redacted]");
});

// extras: Pro short-circuit + CORS preflight unaffected
test("Pro subscriber short-circuits without touching the DB", async () => {
  const be = makeBackend(); const { deps } = makeDeps(be, { getUser: async () => USER, isProSubscriber: async () => true });
  const r = await read(await createHandler(deps)(post({ peek: true }, { authorization: "Bearer t" })));
  assert.deepEqual(r.body, { allowed: true, remaining: -1, isPro: true });
  assert.equal(be.calls.length, 0);
});

test("OPTIONS preflight returns CORS headers", async () => {
  const be = makeBackend(); const { deps } = makeDeps(be);
  const res = await createHandler(deps)(new Request("https://x.test/", { method: "OPTIONS", headers: { origin: "https://aidyor.app" } }));
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), "https://aidyor.app");
});
