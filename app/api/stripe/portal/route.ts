import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchUserProfile } from "@/lib/auth/profile";
import { getStripeServerClient } from "@/lib/stripe/server";
import { siteUrl } from "@/lib/site";


/**
 * Opens Stripe's hosted Billing Portal so a Verified Access subscriber can
 * see invoices, update their card, or cancel without emailing us. Requires a
 * Stripe customer id, which only exists once someone has actually started a
 * checkout (see /api/stripe/checkout) — and requires a Customer portal
 * configuration to be turned on in the Stripe dashboard (Settings > Billing >
 * Customer portal), or Stripe rejects the session with "No configuration
 * provided" in test mode.
 */
export async function POST() {
  const supabase = createClient();
  const {
    data: { user: authUser }
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const profile = await fetchUserProfile(supabase, authUser.id);
  if (!profile?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No billing account yet — subscribe to Verified Access first." },
      { status: 400 }
    );
  }

  let stripe;
  try {
    stripe = getStripeServerClient();
  } catch (error) {
    console.error("Stripe not configured:", error);
    return NextResponse.json({ error: "Billing portal is not configured." }, { status: 500 });
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${siteUrl()}/profile`
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("stripe portal: session create failed:", error);
    const message = error instanceof Error ? error.message : null;
    return NextResponse.json(
      {
        error: message
          ? `Could not open billing portal: ${message}`
          : "Could not open billing portal."
      },
      { status: 500 }
    );
  }
}
