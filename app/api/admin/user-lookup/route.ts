import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

/**
 * Admin-only: where is this person in sign-up? Finds the sign-in account by
 * email and reports whether they confirmed their email, last sign-in, their
 * app profile, and how far they got with seller set-up. No private numbers.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Enter an email address." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Server admin client is not configured (SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 500 }
    );
  }

  // Auth has no lookup-by-email in this SDK; the user list is small, so page through it.
  let account = null;
  for (let page = 1; page <= 50 && !account; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    account = data.users.find((u) => u.email?.toLowerCase() === email) ?? null;
    if (data.users.length < 1000) break;
  }

  if (!account) {
    return NextResponse.json({ found: false, email });
  }

  const [{ data: profile }, { data: seller }] = await Promise.all([
    admin
      .from("users")
      .select("full_name, role, country_code, membership_tier, created_at")
      .eq("id", account.id)
      .maybeSingle(),
    admin
      .from("seller_profiles")
      .select("id, farm_name, state_region, verification_status, is_verified, created_at")
      .eq("user_id", account.id)
      .maybeSingle()
  ]);

  let listingCount = 0;
  if (seller?.id) {
    const { count } = await admin
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", seller.id);
    listingCount = count ?? 0;
  }

  return NextResponse.json({
    found: true,
    email: account.email,
    account: {
      createdAt: account.created_at,
      emailConfirmedAt: account.email_confirmed_at ?? null,
      lastSignInAt: account.last_sign_in_at ?? null,
      signedUpWith: account.app_metadata?.provider ?? "email",
      roleChosenAtSignUp: (account.user_metadata?.role as string | undefined) ?? null
    },
    profile: profile ?? null,
    seller: seller ?? null,
    listingCount
  });
}
