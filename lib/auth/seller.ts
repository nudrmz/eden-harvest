import type { SupabaseClient } from "@supabase/supabase-js";
import { SELLER_PROFILE_STORAGE_KEY } from "@/lib/utils/constants";

export interface SellerProfileRow {
  id: string;
  farm_name: string;
  is_verified: boolean;
}

interface StoredOnboardingProfile {
  farmName?: string;
  countryCode?: string;
  stateRegion?: string;
  localArea?: string;
  phoneE164?: string;
  verificationType?: string;
  documentNumber?: string;
}

export async function fetchSellerProfileByUserId(
  supabase: SupabaseClient,
  userId: string
): Promise<SellerProfileRow | null> {
  const { data, error } = await supabase
    .from("seller_profiles")
    .select("id, farm_name, is_verified")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as SellerProfileRow;
}

export async function resolveAfricanCountryId(
  supabase: SupabaseClient,
  countryCode: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("african_countries")
    .select("id")
    .eq("code", countryCode)
    .maybeSingle();

  if (error || !data) return null;
  return data.id as string;
}

export async function createSellerProfile(
  supabase: SupabaseClient,
  params: {
    userId: string;
    farmName: string;
    countryCode: string;
    stateRegion: string;
    localArea?: string | null;
    whatsappNumber: string;
    verificationDocumentType: string;
    verificationDocumentValue: string;
  }
): Promise<{ profile: SellerProfileRow | null; error: string | null }> {
  const countryId = await resolveAfricanCountryId(supabase, params.countryCode);
  if (!countryId) {
    return { profile: null, error: "Could not find country. Please try onboarding again." };
  }

  const { data, error } = await supabase
    .from("seller_profiles")
    .insert({
      user_id: params.userId,
      farm_name: params.farmName,
      african_country_id: countryId,
      state_region: params.stateRegion,
      local_area: params.localArea ?? null,
      whatsapp_number: params.whatsappNumber,
      verification_document_type: params.verificationDocumentType,
      verification_document_value: params.verificationDocumentValue
    })
    .select("id, farm_name, is_verified")
    .single();

  if (error) {
    if (error.code === "23505") {
      const existing = await fetchSellerProfileByUserId(supabase, params.userId);
      if (existing) return { profile: existing, error: null };
    }
    return { profile: null, error: error.message };
  }

  return { profile: data as SellerProfileRow, error: null };
}

function readStoredOnboardingProfile(): StoredOnboardingProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SELLER_PROFILE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredOnboardingProfile;
  } catch {
    return null;
  }
}

/** Load seller profile from DB, or create from onboarding session data if missing. */
export async function ensureSellerProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<{ profile: SellerProfileRow | null; error: string | null }> {
  const existing = await fetchSellerProfileByUserId(supabase, userId);
  if (existing) return { profile: existing, error: null };

  const stored = readStoredOnboardingProfile();
  if (
    !stored?.farmName ||
    !stored.countryCode ||
    !stored.stateRegion ||
    !stored.phoneE164 ||
    !stored.verificationType ||
    !stored.documentNumber
  ) {
    return {
      profile: null,
      error: "Complete seller onboarding before publishing listings."
    };
  }

  return createSellerProfile(supabase, {
    userId,
    farmName: stored.farmName,
    countryCode: stored.countryCode,
    stateRegion: stored.stateRegion,
    localArea: stored.localArea ?? null,
    whatsappNumber: stored.phoneE164,
    verificationDocumentType: stored.verificationType,
    verificationDocumentValue: stored.documentNumber
  });
}
