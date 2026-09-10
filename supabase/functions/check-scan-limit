import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const PRODUCT_IDS = {
  pro: "prod_TsmarvHsLfmOgX",
  whale_pro: "prod_TsmahG5mQUlguv",
} as const;

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
function corsFor(origin: string | null): Record<string, string> {
  const allowed = isAllowedOrigin(origin) ? origin! : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const cors = corsFor(origin);
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Peek mode: read-only, does NOT consume a scan. Used to show the true
    // remaining count on page load without affecting the user's daily limit.
    let peek = false;
    try {
      const body = await req.json();
      peek = body?.peek === true;
    } catch (_e) {
      // No body or invalid JSON is fine for the normal (consuming) flow.
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    let userId: string | null = null;
    let userEmail: string | null = null;
    if (authHeader.startsWith('Bearer ')) {
      const { data } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      if (data?.user) {
        userId = data.user.id;
        userEmail = data.user.email ?? null;
      }
    }

    if (userId && userEmail) {
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
      if (stripeKey) {
        try {
          const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });
          const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
          if (customers.data.length > 0) {
            const subs = await stripe.subscriptions.list({ customer: customers.data[0].id, status: 'active' });
            for (const s of subs.data) {
              for (const item of s.items.data) {
                const pid = item.price.product as string;
                if (pid === PRODUCT_IDS.pro || pid === PRODUCT_IDS.whale_pro) {
                  return new Response(JSON.stringify({ allowed: true, remaining: -1, isPro: true }), {
                    headers: { ...cors, 'Content-Type': 'application/json' },
                  });
                }
              }
            }
          }
        } catch (e) {
          console.error('[check-scan-limit] Stripe check failed:', e);
        }
      }
    }

    const identifier = userId
      ? `user:${userId}`
      : (() => {
          const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
            || req.headers.get('cf-connecting-ip')
            || 'unknown';
          return `ip:${ip}`;
        })();

    let finalIdentifier = identifier;
    if (identifier.startsWith('ip:')) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identifier));
      finalIdentifier = 'ip:' + Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    if (peek) {
      const { data: peekData, error: peekErr } = await supabase.rpc('get_remaining_free_scans', {
        p_identifier: finalIdentifier,
        p_daily_limit: 5,
      });
      if (peekErr) {
        console.error('[check-scan-limit] peek rpc failed:', peekErr);
        return new Response(JSON.stringify({ error: 'Could not check scan limit' }), {
          status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      const remaining = peekData?.[0]?.remaining ?? 5;
      return new Response(JSON.stringify({ allowed: remaining > 0, remaining, isPro: false }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const { data: limitData, error: limitErr } = await supabase.rpc('check_and_increment_free_scan', {
      p_identifier: finalIdentifier,
    });
    if (limitErr) {
      console.error('[check-scan-limit] rpc failed:', limitErr);
      return new Response(JSON.stringify({ error: 'Could not verify scan limit' }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    const row = limitData?.[0];
    return new Response(JSON.stringify({ allowed: !!row?.allowed, remaining: row?.remaining ?? 0, isPro: false }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[check-scan-limit] error:', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
