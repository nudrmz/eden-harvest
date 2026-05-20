import type { EdenUser } from "@/lib/types/user";

const SELL_LOGIN_MESSAGE = "Please sign in to list your produce.";

/** Where the bottom-nav Sell tab should go for the current auth state. */
export function getSellHref(options: {
  isAuthenticated: boolean;
  profile: EdenUser | null;
}): string {
  if (!options.isAuthenticated) {
    const params = new URLSearchParams({
      message: SELL_LOGIN_MESSAGE,
      redirect: "/onboarding"
    });
    return `/login?${params.toString()}`;
  }
  if (options.profile?.role === "seller") {
    return "/dashboard";
  }
  return "/onboarding";
}
