import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeServerClient } from "@/lib/stripe/server";

/**
 * Stripe event hook — this is what actually flips membership_tier. The
 * client never sets it directly (same reason seller role isn't client-set in
 * /api/seller/onboarding): a buyer could otherwise just call an API with
 * membership_tier: "verified_access" and get paywalled features for free.
 *
 * Setup (Stripe dashboard → Developers → Webhooks, or `stripe listen` for
 * local testing):
 *   endpoint: https://eden-harvest.vercel.app/api/webhooks/stripe
 *   events: checkout.session.completed, customer.subscription.updated,
 *           customer.subscription.deleted
 * The signing secret it gives you goes in STRIPE_WEBHOOK_SECRET.
 */

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

async function resolveUserId(params: {
  metadataUserId?: string | null;
  customerId?: string | null;
}): Promise<string | null> {
  if (params.metadataUserId) return params.metadataUserId;
  if (!params.customerId) return null;

  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin
    .from("users")
    .select("id")
    .eq("stripe_customer_id", params.customerId)
    .maybeSingle();

  return data?.id ?? null;
}

async function setMembership(params: {
  userId: string;
  tier: "free" | "verified_access";
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}): Promise<void> {
  const admin = createAdminClient();
  if (!admin) {
    console.error("stripe webhook: SUPABASE_SERVICE_ROLE_KEY not set, cannot update membership_tier");
    return;
  }

  const update: Record<string, unknown> = { membership_tier: params.tier };
  if (params.stripeCustomerId !== undefined) {
    update.stripe_customer_id = params.stripeCustomerId;
  }
  if (params.stripeSubscriptionId !== undefined) {
    update.stripe_subscription_id = params.stripeSubscriptionId;
  }

  const { error } = await admin.from("users").update(update).eq("id", params.userId);
  if (error) {
    console.error("stripe webhook: membership_tier update failed:", error.message);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  if (session.mode !== "subscription") return;

  const userId = await resolveUserId({
    metadataUserId:
      session.client_reference_id ?? (session.metadata?.eden_harvest_user_id as string | undefined),
    customerId: typeof session.customer === "string" ? session.customer : session.customer?.id
  });

  if (!userId) {
    console.error("stripe webhook: checkout.session.completed with no resolvable user", session.id);
    return;
  }

  await setMembership({
    userId,
    tier: "verified_access",
    stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
    stripeSubscriptionId:
      typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;

  const userId = await resolveUserId({
    metadataUserId: subscription.metadata?.eden_harvest_user_id,
    customerId
  });

  if (!userId) {
    console.error("stripe webhook: subscription event with no resolvable user", subscription.id);
    return;
  }

  const tier = ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status) ? "verified_access" : "free";

  await setMembership({
    userId,
    tier,
    stripeSubscriptionId: subscription.id
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;

  const userId = await resolveUserId({
    metadataUserId: subscription.metadata?.eden_harvest_user_id,
    customerId
  });

  if (!userId) {
    console.error("stripe webhook: subscription.deleted with no resolvable user", subscription.id);
    return;
  }

  // Keep stripe_customer_id — resubscribing should reuse the same customer —
  // but clear the subscription id since this one no longer exists.
  await setMembership({ userId, tier: "free", stripeSubscriptionId: null });
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 401 });
  }

  // Must be the raw body — any re-serialisation changes the bytes Stripe signed.
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripeServerClient().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook rejected:", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    // Ack anyway: Stripe retries aggressively, and a bug here shouldn't cause
    // the same event to redeliver forever. Logged above for follow-up.
    console.error("Stripe webhook handling failed:", error);
    return NextResponse.json({ received: true });
  }
}
