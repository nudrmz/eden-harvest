/**
 * Canonical public site origin for auth email redirects.
 * Prefer NEXT_PUBLIC_SITE_URL so emails never target ephemeral Vercel preview URLs.
 */
const PRODUCTION_ORIGIN = "https://eden-harvest.vercel.app";

/** Preview hosts look like project-abc123xyz-team.vercel.app — not project.vercel.app */
function isEphemeralVercelPreview(origin: string): boolean {
  try {
    const host = new URL(origin).hostname.toLowerCase();
    if (!host.endsWith(".vercel.app")) return false;
    const subdomain = host.slice(0, -".vercel.app".length);
    // Production alias: "eden-harvest". Preview: "eden-harvest-5y00pua80-nudrmzs-projects"
    const parts = subdomain.split("-");
    return parts.length >= 3;
  } catch {
    return false;
  }
}

export function getAuthRedirectOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured && !isEphemeralVercelPreview(configured)) {
    return configured;
  }

  if (typeof window !== "undefined") {
    const origin = window.location.origin.replace(/\/$/, "");
    if (origin && !isEphemeralVercelPreview(origin)) {
      return origin;
    }
  }

  return PRODUCTION_ORIGIN;
}

export function buildAuthCallbackUrl(nextPath: string): string {
  const origin = getAuthRedirectOrigin();
  const next =
    nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/";
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
}
