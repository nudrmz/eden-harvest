/**
 * Canonical public site origin for auth email redirects.
 * Prefer NEXT_PUBLIC_SITE_URL so emails never target ephemeral Vercel preview URLs.
 */
export function getAuthRedirectOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export function buildAuthCallbackUrl(nextPath: string): string {
  const origin = getAuthRedirectOrigin();
  const next =
    nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/";
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
}
