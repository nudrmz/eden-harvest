import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/auth/admin";

/**
 * Retire a seller profile: delete its listings and the profile (enquiries
 * cascade with it), then set the account back to a buyer.
 *
 * Deliberately untouched: the sign-in account, membership_tier / Stripe
 * subscription (Verified Access is a buyer subscription), reviews (keyed
 * to users, not profiles) and Stream chat history.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Server admin client is not configured (SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 500 }
    );
  }

  const body = (await request.json().catch(() => null)) as { confirmFarmName?: string } | null;

  const { data: profile } = await admin
    .from("seller_profiles")
    .select("id, user_id, farm_name")
    .eq("id", params.id)
    .maybeSingle();
  if (!profile) return NextResponse.json({ error: "Seller profile not found." }, { status: 404 });

  // Typed confirmation, checked server-side too.
  if (body?.confirmFarmName?.trim().toLowerCase() !== String(profile.farm_name).trim().toLowerCase()) {
    return NextResponse.json({ error: "Farm name doesn't match." }, { status: 400 });
  }

  // listings.seller_id has no FK on the live database (see the pending
  // listings_seller_fk migration), so delete listings explicitly rather than
  // relying on a cascade that would otherwise leave orphans.
  const { error: listingsError } = await admin
    .from("listings")
    .delete()
    .eq("seller_id", profile.id);
  if (listingsError) {
    return NextResponse.json({ error: `Listings: ${listingsError.message}` }, { status: 500 });
  }

  const { error: profileError } = await admin
    .from("seller_profiles")
    .delete()
    .eq("id", profile.id);
  if (profileError) {
    return NextResponse.json({ error: `Profile: ${profileError.message}` }, { status: 500 });
  }

  const { error: roleError } = await admin
    .from("users")
    .update({ role: "buyer" })
    .eq("id", profile.user_id);
  if (roleError) console.error("retire seller: role reset failed", roleError.message);

  console.info(`admin ${user.email} retired seller profile ${profile.id} (${profile.farm_name})`);
  return NextResponse.json({ ok: true, roleReset: !roleError });
}
