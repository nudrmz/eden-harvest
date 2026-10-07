export type VerifiedAccessPlan = "monthly" | "yearly";

export const stripeConfig = {
  verifiedAccessMonthlyPriceGbp: 7,
  verifiedAccessYearlyPriceGbp: 60
};

/** Stripe Checkout wants the smallest currency unit — pence, not pounds. */
export function verifiedAccessPriceDataForPlan(plan: VerifiedAccessPlan) {
  if (plan === "yearly") {
    return {
      unitAmount: stripeConfig.verifiedAccessYearlyPriceGbp * 100,
      interval: "year" as const,
      label: "Verified Access (yearly)"
    };
  }

  return {
    unitAmount: stripeConfig.verifiedAccessMonthlyPriceGbp * 100,
    interval: "month" as const,
    label: "Verified Access (monthly)"
  };
}
