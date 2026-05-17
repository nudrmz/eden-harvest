import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { EdenUser, UserRole } from "@/lib/types/user";

const BUYER_CURRENCY_BY_CODE: Record<string, string> = {
  GB: "GBP",
  US: "USD",
  AU: "AUD",
  CA: "CAD",
  DE: "EUR",
  IE: "EUR",
  OT: "USD"
};

export function currencyForBuyerCountry(countryCode: string): string {
  return BUYER_CURRENCY_BY_CODE[countryCode] ?? "USD";
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
  if (existing) return { profile: existing, error: null };

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
