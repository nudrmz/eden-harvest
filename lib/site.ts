/**
 * Public site origin used in emails, Stripe return URLs and auth redirects.
 *
 * Set NEXT_PUBLIC_SITE_URL in Vercel (e.g. https://edenharvest.app); this
 * fallback only applies if that variable is missing.
 */
export const DEFAULT_SITE_URL = "https://eden-harvest.vercel.app";

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL).replace(/\/$/, "");
}
