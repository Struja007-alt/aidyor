import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";
import { createHandler, keyKindOf, redact } from "./handler.ts";

const PRODUCT_IDS = {
  pro: "prod_TsmarvHsLfmOgX",
  whale_pro: "prod_TsmahG5mQUlguv",
} as const;

// Subscription statuses that grant Pro access.
// Remove "past_due" if you'd rather cut access immediately on a failed payment.
const PRO_STATUSES = new Set(["active", "trialing", "past_due"]);

const PRO_CACHE_TTL_TRUE_MS = 5 * 60 * 1000;
const PRO_CACHE_TTL_FALSE_MS = 60 * 1000;
const PRO_CACHE_MAX_ENTRIES = 5000;

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const supabase = createClient(supabaseUrl, serviceKey);

// Created once per instance. No apiVersion: uses the version pinned by stripe@17.
const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
const stripe = stripeKey ? new Stripe(stripeKey) : null;

// Per-instance cache. Resets on cold start, which is fine.
const proCache = new Map<string, { value: boolean; expires: number }>();

async function lookupPro(email: string): Promise<boolean> {
  if (!stripe) return false;

  const customers = await stripe.customers.list({ email, limit: 10 });
  for (const customer of customers.data) {
    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 20,
    });
    const hasPro = subs.data.some((s) =>
      PRO_STATUSES.has(s.status) &&
      s.items.data.some((i) => {
        const pid = typeof i.price.product === "string"
          ? i.price.product
          : i.price.product.id;
        return pid === PRODUCT_IDS.pro || pid === PRODUCT_IDS.whale_pro;
      })
    );
    if (hasPro) return true;
  }
  return false;
}

const handler = createHandler({
  rpc: async (fn, args) => {
    const { data, error } = await supabase.rpc(fn, args);
    return { data, error };
  },
  getUser: async (token) => {
    // Anonymous visitors send the anon key as the Bearer token. It is not a
    // user JWT, so skip the lookup (and the log noise) and use the IP bucket.
    if (anonKey && token === anonKey) return null;

    const { data, error } = await supabase.auth.getUser(token);
    if (error) {
      // Logging only; auth behavior unchanged (falls back to the IP bucket as before).
      console.warn(JSON.stringify({ event: "auth_get_user_failed", message: redact(error.message) }));
    }
    return data?.user
      ? {
        id: data.user.id,
        email: data.user.email ?? null,
        emailConfirmed: !!data.user.email_confirmed_at,
      }
      : null;
  },
  isProSubscriber: async (email) => {
    const key = email.toLowerCase();
    const now = Date.now();

    const cached = proCache.get(key);
    if (cached && cached.expires > now) return cached.value;

    const value = await lookupPro(email);

    if (proCache.size >= PRO_CACHE_MAX_ENTRIES) proCache.clear();
    proCache.set(key, {
      value,
      expires: now + (value ? PRO_CACHE_TTL_TRUE_MS : PRO_CACHE_TTL_FALSE_MS),
    });
    return value;
  },
  sha256Hex: async (input) => {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  },
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  log: (level, fields) => {
    const line = JSON.stringify({ fn: "check-scan-limit", ...fields });
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  },
  keyKind: keyKindOf(serviceKey),
  now: () => Date.now(),
  allowLocalhostOrigins: Deno.env.get("ALLOW_LOCALHOST_ORIGINS") === "true",
});

serve(handler);
