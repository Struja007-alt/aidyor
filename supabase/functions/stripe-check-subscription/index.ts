import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Dynamic CORS - restrict to allowed origins
const ALLOWED_ORIGINS = [
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
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Credentials': 'true',
  };
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Stripe product IDs mapping
const PRODUCT_IDS = {
  pro: "prod_TsmarvHsLfmOgX",
  whale_pro: "prod_TsmahG5mQUlguv",
} as const;

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Check for Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found");
      return new Response(JSON.stringify({ 
        subscribed: false,
        has_pro: false,
        has_whale_pro: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Get all active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
    });

    let hasPro = false;
    let hasWhalePro = false;
    let proSubscriptionEnd: string | null = null;
    let whaleProSubscriptionEnd: string | null = null;

    for (const subscription of subscriptions.data) {
      for (const item of subscription.items.data) {
        const productId = item.price.product as string;
        const endDate = new Date(subscription.current_period_end * 1000).toISOString();
        
        if (productId === PRODUCT_IDS.pro) {
          hasPro = true;
          proSubscriptionEnd = endDate;
          logStep("Pro subscription found", { subscriptionId: subscription.id, endDate });
        }
        if (productId === PRODUCT_IDS.whale_pro) {
          hasWhalePro = true;
          whaleProSubscriptionEnd = endDate;
          logStep("Whale Pro subscription found", { subscriptionId: subscription.id, endDate });
        }
      }
    }

    return new Response(JSON.stringify({
      subscribed: hasPro || hasWhalePro,
      has_pro: hasPro,
      has_whale_pro: hasWhalePro,
      pro_subscription_end: proSubscriptionEnd,
      whale_pro_subscription_end: whaleProSubscriptionEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: "Subscription check failed. Please try again." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
