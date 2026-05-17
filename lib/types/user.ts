export type UserRole = "buyer" | "seller";
export type MembershipTier = "free" | "verified_access";

export interface EdenUser {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  country_code: string | null;
  detected_currency: string | null;
  membership_tier: MembershipTier;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
}
