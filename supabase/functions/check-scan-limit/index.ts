import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";
import { createHandler, keyKindOf, redact } from "./handler.ts";

const PRODUCT_IDS = {
  pro: "prod_TsmarvHsLfmOgX",
  whale_pro: "prod_TsmahG5mQUlguv",
} as const;

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceKey);

const handler = createHandler({
  rpc: async (fn, args) => {
    const { data, error } = await supabase.rpc(fn, args);
    return { data, error };
  },
  getUser: async (token) => {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) {
      // Logging only; auth behavior unchanged (falls back to the IP bucket as before).
      console.warn(JSON.stringify({ event: "auth_get_user_failed", message: redact(error.message) }));
    }
    return data?.user ? { id: data.user.id, email: data.user.email ?? null } : null;
  },
  isProSubscriber: async (email) => {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return false;
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) return false;
    const subs = await stripe.subscriptions.list({ customer: customers.data[0].id, status: "active" });
    return subs.data.some((s) =>
      s.items.data.some((i) => {
        const pid = i.price.product as string;
        return pid === PRODUCT_IDS.pro || pid === PRODUCT_IDS.whale_pro;
      })
    );
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
});

serve(handler);
