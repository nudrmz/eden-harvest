import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface OnboardingBody {
  farmName?: string;
  countryCode?: string;
  stateRegion?: string;
  localArea?: string | null;
  whatsappNumber?: string;
  verificationDocumentType?: string;
  verificationDocumentValue?: string;
}

interface SellerProfileRow {
  id: string;
  farm_name: string;
  is_verified: boolean;
}

const PROFILE_COLUMNS = "id, farm_name, is_verified";

/**
 * Promote the account to seller. Runs on the admin client because the
 * users_update_own RLS policy lets a user edit their own row, which would make
 * role self-assignable from the browser.
 *
 * This — not the role in signup metadata — is what makes someone a seller.
 * Google sign-ins carry no role claim, so handle_new_user() defaults them to
 * buyer; without this they would finish onboarding still flagged as a buyer.
 */
async function promoteToSeller(
  admin: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { error } = await admin
    .from("users")
    .update({ role: "seller" })
    .eq("id", userId);

  return error ? error.message : null;
}

export async function POST(request: NextRequest) {
  let body: OnboardingBody;
  try {
    body = (await request.json()) as OnboardingBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const farmName = body.farmName?.trim();
  const countryCode = body.countryCode?.trim();
  const stateRegion = body.stateRegion?.trim();
  const whatsappNumber = body.whatsappNumber?.trim();
  const documentType = body.verificationDocumentType?.trim();
  const documentValue = body.verificationDocumentValue?.trim();

  if (
    !farmName ||
    !countryCode ||
    !stateRegion ||
    !whatsappNumber ||
    !documentType ||
    !documentValue
  ) {
    return NextResponse.json(
      { error: "Complete seller onboarding before publishing listings." },
      { status: 400 }
    );
  }

  const supabase = createClient();
  const {
    data: { user: authUser }
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    console.error("seller onboarding: SUPABASE_SERVICE_ROLE_KEY not set");
    return NextResponse.json(
      { error: "Server is not configured for seller onboarding." },
      { status: 500 }
    );
  }

  // Resubmitting is the recovery path if the role update below ever fails, so
  // an existing profile still falls through to the promotion.
  const { data: existing } = await admin
    .from("seller_profiles")
    .select(PROFILE_COLUMNS)
    .eq("user_id", authUser.id)
    .maybeSingle();

  let profile = existing as SellerProfileRow | null;

  if (!profile) {
    const { data: country } = await admin
      .from("african_countries")
      .select("id")
      .eq("code", countryCode)
      .maybeSingle();

    if (!country) {
      return NextResponse.json(
        { error: "Could not find country. Please try onboarding again." },
        { status: 400 }
      );
    }

    const { data: inserted, error: insertError } = await admin
      .from("seller_profiles")
      .insert({
        user_id: authUser.id,
        farm_name: farmName,
        african_country_id: country.id,
        state_region: stateRegion,
        local_area: body.localArea?.trim() || null,
        whatsapp_number: whatsappNumber,
        verification_document_type: documentType,
        verification_document_value: documentValue
      })
      .select(PROFILE_COLUMNS)
      .single();

    if (insertError) {
      console.error("seller profile insert:", insertError.message);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    profile = inserted as SellerProfileRow;
  }

  // Profile first, then role: a seller row without the role is fixed by
  // resubmitting, while the reverse would leave the dashboard loading a seller
  // who has no profile to show.
  const promoteError = await promoteToSeller(admin, authUser.id);
  if (promoteError) {
    console.error("seller role update:", promoteError);
    return NextResponse.json(
      { error: "Saved your farm details but could not activate your seller account." },
      { status: 500 }
    );
  }

  return NextResponse.json({ profile });
}
