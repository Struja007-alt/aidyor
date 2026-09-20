import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

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

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Cryptographically secure key generation (Web Crypto API, OS-backed CSPRNG),
// with rejection sampling to avoid modulo bias across the 62-character alphabet.
function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const alphabetSize = chars.length; // 62
  const maxValid = 256 - (256 % alphabetSize); // 248, discard bytes >= this to keep uniform distribution
  let key = 'aidyor_sk_';
  const buf = new Uint8Array(1);
  while (key.length < 10 + 32) {
    crypto.getRandomValues(buf);
    if (buf[0] < maxValid) {
      key += chars.charAt(buf[0] % alphabetSize);
    }
  }
  return key;
}

const VALID_TIERS = ['starter', 'growth', 'enterprise'];

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace('/api-signup', '');
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');

  try {
    if (!stripeKey) {
      console.error('[api-signup] STRIPE_SECRET_KEY not configured');
      return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });

    // ----- Step 1: create a pending client + Stripe Checkout session -----
    if (path === '/checkout' && req.method === 'POST') {
      const body = await req.json();
      const { company_name, contact_email, plan_tier } = body;

      if (!company_name || typeof company_name !== 'string' || company_name.trim().length < 2) {
        return new Response(JSON.stringify({ error: 'Invalid request', message: 'company_name is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (!contact_email || !isValidEmail(contact_email)) {
        return new Response(JSON.stringify({ error: 'Invalid request', message: 'A valid contact_email is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (!plan_tier || !VALID_TIERS.includes(plan_tier)) {
        return new Response(JSON.stringify({ error: 'Invalid request', message: `plan_tier must be one of: ${VALID_TIERS.join(', ')}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: plan, error: planError } = await supabase
        .from('api_plans')
        .select('*')
        .eq('tier', plan_tier)
        .single();

      if (planError || !plan) {
        return new Response(JSON.stringify({ error: 'Plan configuration error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: client, error: clientError } = await supabase
        .from('api_clients')
        .insert({ company_name: company_name.trim(), contact_email: contact_email.trim(), plan_tier, status: 'pending' })
        .select()
        .single();

      if (clientError) {
        console.error('[api-signup] Failed to create client:', clientError);
        return new Response(JSON.stringify({ error: 'Failed to start signup' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const siteOrigin = isAllowedOrigin(origin) ? origin! : 'https://aidyor.app';

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: contact_email.trim(),
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: `AIDYOR API — ${plan.name}`, description: `${plan.monthly_scan_limit.toLocaleString()} scans/month, ${plan.rate_limit_per_minute} req/min` },
            unit_amount: plan.price_cents,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        }],
        metadata: { aidyor_client_id: client.id, aidyor_plan_tier: plan_tier, aidyor_product: 'api' },
        subscription_data: { metadata: { aidyor_client_id: client.id, aidyor_plan_tier: plan_tier, aidyor_product: 'api' } },
        success_url: `${siteOrigin}/api/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteOrigin}/api`,
      });

      await supabase.from('api_clients').update({ stripe_checkout_session_id: session.id }).eq('id', client.id);

      return new Response(JSON.stringify({ checkout_url: session.url }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ----- Step 2: verify payment, activate client, reveal key once -----
    if (path === '/complete' && req.method === 'GET') {
      const sessionId = url.searchParams.get('session_id');
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Missing session_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      let session: Stripe.Checkout.Session;
      try {
        session = await stripe.checkout.sessions.retrieve(sessionId);
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (session.payment_status !== 'paid') {
        return new Response(JSON.stringify({ error: 'Payment not completed', payment_status: session.payment_status }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: client, error: clientError } = await supabase
        .from('api_clients')
        .select('*')
        .eq('stripe_checkout_session_id', sessionId)
        .single();

      if (clientError || !client) {
        return new Response(JSON.stringify({ error: 'No matching signup found for this session' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Already activated — do not regenerate or re-reveal a key
      if (client.status === 'active') {
        return new Response(JSON.stringify({
          already_activated: true,
          company_name: client.company_name,
          plan_tier: client.plan_tier,
          message: 'This account is already active. Your API key was shown once at activation — contact support if you need it reset.',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const rawKey = generateApiKey();
      const keyHash = await hashApiKey(rawKey);
      const keyPrefix = rawKey.substring(0, 12);

      const { error: keyError } = await supabase
        .from('api_keys')
        .insert({ client_id: client.id, key_hash: keyHash, key_prefix: keyPrefix, name: 'Default Key' });

      if (keyError) {
        console.error('[api-signup] Failed to create key:', keyError);
        return new Response(JSON.stringify({ error: 'Failed to activate account' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      await supabase
        .from('api_clients')
        .update({
          status: 'active',
          stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null,
          stripe_subscription_id: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null,
        })
        .eq('id', client.id);

      return new Response(JSON.stringify({
        success: true,
        company_name: client.company_name,
        plan_tier: client.plan_tier,
        api_key: rawKey,
        key_prefix: keyPrefix,
        warning: 'Store this key securely now. It will not be shown again.',
      }), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[api-signup] Error:', error);
    return new Response(JSON.stringify({ error: 'Request failed', message: 'An error occurred processing your request' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
