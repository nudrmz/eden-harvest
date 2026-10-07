import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchUserProfile } from "@/lib/auth/profile";
import { getStripeServerClient } from "@/lib/stripe/server";
import { verifiedAccessPriceDataForPlan, type VerifiedAccessPlan } from "@/lib/stripe/config";

interface CheckoutBody {
  plan?: VerifiedAccessPlan;
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://eden-harvest.vercel.app";
}

/**
 * Reuse an existing Stripe customer if this buyer already has one (e.g. a
 * lapsed subscriber upgrading again), otherwise create one and persist it —
 * so the next checkout, and the webhook's lookups by stripe_customer_id,
 * both resolve back to the same buyer.
 */
async function resolveStripeCustomerId(params: {
  userId: string;
  email: string;
  existingCustomerId: string | null;
}): Promise<string> {
  const stripe = getStripeServerClient();

  if (params.existingCustomerId) {
    return params.existingCustomerId;
  }

  const customer = await stripe.customers.create({
    email: params.email,
    metadata: { eden_harvest_user_id: params.userId }
  });

  // Best-effort, and genuinely isolated from the caller: the webhook also
  // writes stripe_customer_id on checkout.session.completed, so a failure
  // here should never block checkout itself — only risk one extra Stripe
  // customer if the buyer starts checkout again before that webhook lands.
  try {
    const admin = createAdminClient();
    if (admin) {
      const { error } = await admin
        .from("users")
        .update({ stripe_customer_id: customer.id })
        .eq("id", params.userId);
      if (error) {
        console.error("stripe checkout: stripe_customer_id persist failed:", error.message);
      }
    }
  } catch (error) {
    console.error("stripe checkout: stripe_customer_id persist threw:", error);
  }

  return customer.id;
}

export async function POST(request: NextRequest) {
  let body: CheckoutBody;
  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const plan: VerifiedAccessPlan = body.plan === "yearly" ? "yearly" : "monthly";

  const supabase = createClient();
  const {
    data: { user: authUser }
  } = await supabase.auth.getUser();

  if (!authUser?.email) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const buyerProfile = await fetchUserProfile(supabase, authUser.id);
  if (buyerProfile?.membership_tier === "verified_access") {
    return NextResponse.json(
      { error: "You already have Verified Access." },
      { status: 400 }
    );
  }

  let stripe;
  try {
    stripe = getStripeServerClient();
  } catch (error) {
    console.error("Stripe not configured:", error);
    return NextResponse.json({ error: "Checkout is not configured." }, { status: 500 });
  }

  let customerId: string;
  try {
    customerId = await resolveStripeCustomerId({
      userId: authUser.id,
      email: authUser.email,
      existingCustomerId: buyerProfile?.stripe_customer_id ?? null
    });
  } catch (error) {
    console.error("stripe checkout: customer resolve failed:", error);
    return NextResponse.json(
      { error: "Could not start checkout (customer setup failed)." },
      { status: 500 }
    );
  }

  try {
    const priceData = verifiedAccessPriceDataForPlan(plan);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: authUser.id,
      // Belt-and-braces alongside client_reference_id — the webhook can read
      // whichever field a given event type actually carries.
      metadata: { eden_harvest_user_id: authUser.id, plan },
      subscription_data: {
        metadata: { eden_harvest_user_id: authUser.id, plan }
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: priceData.unitAmount,
            recurring: { interval: priceData.interval },
            product_data: { name: priceData.label }
          }
        }
      ],
      success_url: `${siteUrl()}/upgrade?checkout=success`,
      cancel_url: `${siteUrl()}/upgrade?checkout=canceled`
    });

    if (!session.url) {
      console.error("stripe checkout: session created with no url", session.id);
      return NextResponse.json(
        { error: "Could not start checkout (no redirect URL)." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("stripe checkout: session create failed:", error);
    const stripeMessage = error instanceof Error ? error.message : null;
    return NextResponse.json(
      {
        error: stripeMessage
          ? `Could not start checkout: ${stripeMessage}`
          : "Could not start checkout (Stripe rejected the request)."
      },
      { status: 500 }
    );
  }
}
