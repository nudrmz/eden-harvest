import type { EdenUser } from "@/lib/types/user";

/** Where the bottom-nav Sell tab should go for the current auth state. */
export function getSellHref(options: {
  isAuthenticated: boolean;
  profile: EdenUser | null;
}): string {
  if (!options.isAuthenticated) {
    return "/register?role=seller";
  }
  if (options.profile?.role === "seller") {
    return "/dashboard";
  }
  return "/onboarding";
}
