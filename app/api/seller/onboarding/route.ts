import { NextRequest, NextResponse, after } from "next/server";
import { notifyAdminOfSellerApplication } from "@/lib/notifications/adminAlerts";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { saveSellerPrivateDetails } from "@/lib/seller/privateDetails";
import { isOwnPhotoUrl } from "@/lib/storage/photos";

interface OnboardingBody {
  farmName?: string;
  countryCode?: string;
  stateRegion?: string;
  localArea?: string | null;
  whatsappNumber?: string;
  verificationDocumentType?: string;
  verificationDocumentValue?: string;
  farmPhotoUrl?: string | null;
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

  // Any country is fine; it just has to be a full international number.
  if (!/^\+[1-9]\d{6,14}$/.test(whatsappNumber)) {
    return NextResponse.json(
      { error: "Please enter a valid phone number, including the country code." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user: authUser }
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  // Only accept photos uploaded by this user via /api/uploads/photo.
  const farmPhotoUrl = body.farmPhotoUrl?.trim() || null;
  if (farmPhotoUrl && !isOwnPhotoUrl(farmPhotoUrl, authUser.id)) {
    return NextResponse.json({ error: "Invalid farm photo." }, { status: 400 });
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
      .select("id, name")
      .eq("code", countryCode)
      .maybeSingle();

    if (!country) {
      return NextResponse.json(
        { error: "Could not find country. Please try onboarding again." },
        { status: 400 }
      );
    }

    const savedPrivate = await saveSellerPrivateDetails(admin, authUser.id, {
      whatsapp: whatsappNumber,
      documentValue
    });
    if (!savedPrivate) {
      return NextResponse.json(
        { error: "Could not save your details. Please try again." },
        { status: 500 }
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
        // Private: kept in the seller's account (see lib/seller/privateDetails),
        // not in this table, which other users can read.
        whatsapp_number: "",
        verification_document_type: documentType,
        verification_document_value: "",
        farm_photo_url: farmPhotoUrl
      })
      .select(PROFILE_COLUMNS)
      .single();

    if (insertError) {
      console.error("seller profile insert:", insertError.message);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    profile = inserted as SellerProfileRow;

    // Tell the team a new farm is waiting for approval (after the response).
    const countryName = (country as { name?: string }).name ?? countryCode;
    after(() =>
      notifyAdminOfSellerApplication({
        email: authUser.email,
        farmName,
        country: countryName,
        stateRegion,
        localArea: body.localArea?.trim() || null,
        documentType
      })
    );
  } else if (farmPhotoUrl) {
    // Resubmitting onboarding is also how an existing seller adds a photo.
    const { error: photoError } = await admin
      .from("seller_profiles")
      .update({ farm_photo_url: farmPhotoUrl })
      .eq("id", profile.id);
    if (photoError) console.error("seller farm photo update:", photoError.message);
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
