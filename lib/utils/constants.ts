export const BUYER_MEMBERSHIP_TIERS = {
  FREE: "free",
  VERIFIED_ACCESS: "verified_access"
} as const;

/** Browser session — populated after onboarding submit (mock until Supabase) */
export const SELLER_PROFILE_STORAGE_KEY = "eden_harvest_seller_profile";

export const BUYER_COUNTRY_OPTIONS = [
  { value: "GB", label: "United Kingdom" },
  { value: "US", label: "United States" },
  { value: "AU", label: "Australia" },
  { value: "CA", label: "Canada" },
  { value: "DE", label: "Germany" },
  { value: "IE", label: "Ireland" },
  { value: "OT", label: "Other" }
] as const;
