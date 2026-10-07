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

/**
 * Creating the profile also promotes users.role to 'seller', which needs the
 * service-role key, so the write happens in the route rather than here.
 */
export async function createSellerProfile(params: {
  farmName: string;
  countryCode: string;
  stateRegion: string;
  localArea?: string | null;
  whatsappNumber: string;
  verificationDocumentType: string;
  verificationDocumentValue: string;
  farmPhotoUrl?: string | null;
}): Promise<{ profile: SellerProfileRow | null; error: string | null }> {
  let response: Response;
  try {
    response = await fetch("/api/seller/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params)
    });
  } catch {
    return { profile: null, error: "Network error. Please try again." };
  }

  const payload = (await response.json().catch(() => null)) as {
    profile?: SellerProfileRow;
    error?: string;
  } | null;

  if (!response.ok || !payload?.profile) {
    return {
      profile: null,
      error: payload?.error ?? "Could not save your seller profile."
    };
  }

  return { profile: payload.profile, error: null };
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

  return createSellerProfile({
    farmName: stored.farmName,
    countryCode: stored.countryCode,
    stateRegion: stored.stateRegion,
    localArea: stored.localArea ?? null,
    whatsappNumber: stored.phoneE164,
    verificationDocumentType: stored.verificationType,
    verificationDocumentValue: stored.documentNumber
  });
}
