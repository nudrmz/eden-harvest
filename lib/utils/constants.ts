export const BUYER_MEMBERSHIP_TIERS = {
  FREE: "free",
  VERIFIED_ACCESS: "verified_access"
} as const;

/** Browser session — populated after onboarding submit (mock until Supabase) */
export const SELLER_PROFILE_STORAGE_KEY = "eden_harvest_seller_profile";

// Buyer countries: see lib/data/buyer-countries.ts (every country, searchable).
