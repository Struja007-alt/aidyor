import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

const PRODUCT_IDS = {
  pro: "prod_TsmarvHsLfmOgX",
  whale_pro: "prod_TsmahG5mQUlguv",
} as const;

// FIX: the live RPC is get_user_id_by_email(p_email text). The old code passed
// { email_input }, so every lookup failed and no whale_subscriptions row was ever touched.
async function findUserIdByEmail(supabaseAdmin: ReturnType<typeof createClient>, email: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.rpc('get_user_id_by_email', { p_email: email.trim().toLowerCase() });
  if (error) {
    logStep("get_user_id_by_email RPC error", { error: error.message });
    return null;
  }
  return (data as string | null) ?? null;
}

// ----- Whale Pro lifecycle, keyed by user_id (UNIQUE in whale_subscriptions) -----
// Creates the row if missing, otherwise updates it. Throws on DB error so Stripe retries the webhook.
async function syncWhaleSubscription(
  supabaseAdmin: ReturnType<typeof createClient>,
  subscription: Stripe.Subscription,
  email: string | null | undefined,
  forceExpired = false,
  knownUserId: string | null = null,
) {
  const whaleItem = subscription.items.data.find(
    (item) => (item.price.product as string) === PRODUCT_IDS.whale_pro,
  );
  if (!whaleItem) return; // not a Whale Pro subscription

  if (!knownUserId && !email) {
    logStep("Whale Pro subscription without user id or customer email, skipping", { subscriptionId: subscription.id });
    return;
  }

  // Prefer the user_id that stripe-checkout stored in the session metadata; fall back to email lookup.
  const userId = knownUserId ?? (email ? await findUserIdByEmail(supabaseAdmin, email) : null);
  if (!userId) {
    logStep("No Supabase user found for Whale Pro subscription", { subscriptionId: subscription.id });
    return;
  }

  // basil API versions moved current_period_end from the subscription to its items.
  const periodEndUnix: number | null =
    (whaleItem as unknown as { current_period_end?: number }).current_period_end ??
    (subscription as unknown as { current_period_end?: number }).current_period_end ??
    null;

  const expiresAt = forceExpired
    ? new Date().toISOString()
    : periodEndUnix
      ? new Date(periodEndUnix * 1000).toISOString()
      : null;

  const status = forceExpired || subscription.status === "canceled" ? "expired" : subscription.status;

  const { error } = await supabaseAdmin
    .from("whale_subscriptions")
    .upsert(
      {
        user_id: userId,
        stripe_subscription_id: subscription.id,
        status,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (error) {
    throw new Error(`whale_subscriptions upsert failed: ${error.message}`);
  }

  logStep("Synced whale_subscriptions", { userId, status, expiresAt });
}

// ----- B2B API client lifecycle, keyed by stripe_subscription_id -----
async function syncApiClientSubscription(supabaseAdmin: ReturnType<typeof createClient>, subscription: Stripe.Subscription) {
  const { data: apiClient, error } = await supabaseAdmin
    .from('api_clients')
    .select('id, status')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle();

  if (error) {
    logStep("api_clients lookup error", { error: error.message });
    return;
  }
  if (!apiClient) return; // not a B2B API subscription

  const inactiveStatuses = ['canceled', 'unpaid', 'incomplete_expired'];
  let newStatus: string | null = null;

  if (inactiveStatuses.includes(subscription.status)) {
    newStatus = 'suspended';
  } else if (subscription.status === 'active' && apiClient.status !== 'active') {
    newStatus = 'active';
  }

  if (newStatus && newStatus !== apiClient.status) {
    await supabaseAdmin.from('api_clients').update({ status: newStatus }).eq('id', apiClient.id);
    logStep("api_clients status synced", { clientId: apiClient.id, status: newStatus, stripeStatus: subscription.status });
  }
}

async function getCustomerEmail(stripe: Stripe, customerId: string): Promise<string | null> {
  const customer = await stripe.customers.retrieve(customerId);
  if ((customer as Stripe.DeletedCustomer).deleted) return null;
  return (customer as Stripe.Customer).email ?? null;
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!stripeKey || !webhookSecret) {
      throw new Error("Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("No stripe-signature header");
    }

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logStep("Signature verification failed", { error: msg });
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
    }

    logStep("Event verified", { type: event.type, id: event.id });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    switch (event.type) {
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription && invoice.customer_email) {
          logStep("Payment succeeded", {
            email: invoice.customer_email,
            subscription: invoice.subscription,
            amount: invoice.amount_paid,
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Payment failed", {
          email: invoice.customer_email,
          subscription: invoice.subscription,
          attempt: invoice.attempt_count,
        });
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const email = await getCustomerEmail(stripe, subscription.customer as string);

        logStep("Subscription created/updated", {
          subscriptionId: subscription.id,
          status: subscription.status,
          email,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        });

        // Whale Pro: create the row if missing, otherwise sync status + expires_at
        await syncWhaleSubscription(supabaseAdmin, subscription, email);

        // B2B API clients (matched by stripe_subscription_id, since price is created dynamically at checkout)
        await syncApiClientSubscription(supabaseAdmin, subscription);

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const email = await getCustomerEmail(stripe, subscription.customer as string);

        logStep("Subscription deleted", {
          subscriptionId: subscription.id,
          email,
        });

        await syncWhaleSubscription(supabaseAdmin, subscription, email, true);

        // B2B API client — subscription is fully gone, suspend access
        await syncApiClientSubscription(supabaseAdmin, subscription);

        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout completed", {
          sessionId: session.id,
          customerEmail: session.customer_email,
          subscriptionId: session.subscription,
          priceType: session.metadata?.price_type,
          aidyorProduct: session.metadata?.aidyor_product,
        });

        // Grant Whale Pro immediately on checkout, without depending on the .created event being enabled
        if (session.mode === "subscription" && session.subscription) {
          const subscriptionId = typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const email = session.customer_details?.email ?? session.customer_email ?? null;
          await syncWhaleSubscription(
            supabaseAdmin,
            subscription,
            email,
            false,
            session.metadata?.user_id ?? null,
          );
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
