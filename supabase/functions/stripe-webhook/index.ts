import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Stripe product IDs
const PRODUCT_IDS = {
  pro: "prod_TsmarvHsLfmOgX",
  whale_pro: "prod_TsmahG5mQUlguv",
} as const;

serve(async (req) => {
  // Webhooks are POST only
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

    // Get raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("No stripe-signature header");
    }

    // Verify webhook signature
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
      // Subscription successfully created or renewed
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

      // Payment failed on a subscription invoice
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Payment failed", {
          email: invoice.customer_email,
          subscription: invoice.subscription,
          attempt: invoice.attempt_count,
        });
        // Stripe will automatically retry and eventually cancel
        // Log for monitoring — future: send user notification
        break;
      }

      // Subscription updated (plan change, status change)
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Resolve customer email
        const customer = await stripe.customers.retrieve(customerId);
        const email = (customer as Stripe.Customer).email;

        logStep("Subscription updated", {
          subscriptionId: subscription.id,
          status: subscription.status,
          email,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        });

        // Check which products are in this subscription
        for (const item of subscription.items.data) {
          const productId = item.price.product as string;
          if (productId === PRODUCT_IDS.whale_pro && subscription.status !== "active") {
            // Whale Pro subscription is no longer active — update whale_subscriptions
            if (email) {
              const { data: userData } = await supabaseAdmin.auth.admin.listUsers();
              const matchedUser = userData?.users?.find(u => u.email === email);
              if (matchedUser) {
                await supabaseAdmin
                  .from("whale_subscriptions")
                  .update({ status: subscription.status === "canceled" ? "expired" : subscription.status })
                  .eq("user_id", matchedUser.id);
                logStep("Updated whale_subscriptions", { userId: matchedUser.id, status: subscription.status });
              }
            }
          }
        }
        break;
      }

      // Subscription fully canceled/deleted
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const customer = await stripe.customers.retrieve(customerId);
        const email = (customer as Stripe.Customer).email;

        logStep("Subscription deleted", {
          subscriptionId: subscription.id,
          email,
        });

        // Update whale_subscriptions if this was a Whale Pro sub
        for (const item of subscription.items.data) {
          const productId = item.price.product as string;
          if (productId === PRODUCT_IDS.whale_pro && email) {
            const { data: userData } = await supabaseAdmin.auth.admin.listUsers();
            const matchedUser = userData?.users?.find(u => u.email === email);
            if (matchedUser) {
              await supabaseAdmin
                .from("whale_subscriptions")
                .update({ status: "expired", expires_at: new Date().toISOString() })
                .eq("user_id", matchedUser.id);
              logStep("Expired whale_subscriptions", { userId: matchedUser.id });
            }
          }
        }
        break;
      }

      // Checkout session completed — can confirm initial subscription activation
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout completed", {
          sessionId: session.id,
          customerEmail: session.customer_email,
          subscriptionId: session.subscription,
          priceType: session.metadata?.price_type,
        });
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
