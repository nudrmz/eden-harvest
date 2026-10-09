import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { EdenUser, UserRole } from "@/lib/types/user";
import { currencyForCountryCode } from "@/lib/data/buyer-countries";

export function currencyForBuyerCountry(countryCode: string): string {
  return currencyForCountryCode(countryCode);
}

/**
 * The handle_new_user() DB trigger only knows six countries' currencies and
 * defaults everything else to USD (it can't be updated while the Supabase SQL
 * editor refuses this account). Correct it from the app side on load.
 */
async function repairBuyerCurrency(
  supabase: SupabaseClient,
  profile: EdenUser
): Promise<EdenUser> {
  if (profile.role !== "buyer" || !profile.country_code) return profile;
  const expected = currencyForBuyerCountry(profile.country_code);
  if (profile.detected_currency === expected) return profile;
  const { error } = await supabase
    .from("users")
    .update({ detected_currency: expected })
    .eq("id", profile.id);
  return error ? profile : { ...profile, detected_currency: expected };
}

export async function fetchUserProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<EdenUser | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as EdenUser;
}

export async function createUserProfile(
  supabase: SupabaseClient,
  params: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
    countryCode?: string | null;
  }
): Promise<{ error: string | null }> {
  const countryCode = params.role === "buyer" ? params.countryCode ?? null : null;
  const detectedCurrency =
    params.role === "buyer" && countryCode
      ? currencyForBuyerCountry(countryCode)
      : null;

  const { error } = await supabase.from("users").insert({
    id: params.id,
    email: params.email,
    full_name: params.fullName,
    role: params.role,
    country_code: countryCode,
    detected_currency: detectedCurrency,
    membership_tier: "free"
  });

  if (error) return { error: error.message };
  return { error: null };
}

function roleFromMetadata(metadata: Record<string, unknown>): UserRole {
  return metadata.role === "seller" ? "seller" : "buyer";
}

/** Create public.users row when auth exists but profile was never inserted (e.g. email confirmation flow). */
export async function ensureUserProfile(
  supabase: SupabaseClient,
  authUser: User
): Promise<{ profile: EdenUser | null; error: string | null }> {
  const existing = await fetchUserProfile(supabase, authUser.id);
  if (existing) return { profile: await repairBuyerCurrency(supabase, existing), error: null };

  const metadata = (authUser.user_metadata ?? {}) as Record<string, unknown>;
  const role = roleFromMetadata(metadata);
  const fullName =
    typeof metadata.full_name === "string" && metadata.full_name.trim()
      ? metadata.full_name.trim()
      : (authUser.email?.split("@")[0] ?? "User");
  const countryCode =
    typeof metadata.country_code === "string" ? metadata.country_code : null;

  const { error: insertError } = await createUserProfile(supabase, {
    id: authUser.id,
    email: authUser.email ?? "",
    fullName,
    role,
    countryCode: role === "buyer" ? countryCode : null
  });

  if (insertError) {
    return { profile: null, error: insertError };
  }

  const profile = await fetchUserProfile(supabase, authUser.id);
  return {
    profile,
    error: profile ? null : "Could not load your profile after sign in."
  };
}
