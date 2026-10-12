import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { siteUrl } from "@/lib/site";

/**
 * Signed one-click unsubscribe links, so turning off message emails works from
 * the email itself without signing in. The token is an HMAC of the user id;
 * it can only ever switch that one user's message emails off.
 */
function secret(): string {
  const value =
    process.env.NOTIFICATIONS_SECRET?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  if (!value) throw new Error("No secret available to sign unsubscribe links.");
  return value;
}

export function unsubscribeToken(userId: string): string {
  return createHmac("sha256", secret()).update(`unsubscribe:messages:${userId}`).digest("hex").slice(0, 32);
}

export function isValidUnsubscribeToken(userId: string, token: string): boolean {
  const expected = Buffer.from(unsubscribeToken(userId));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function unsubscribeUrl(userId: string): string {
  const params = new URLSearchParams({ u: userId, t: unsubscribeToken(userId) });
  return `${siteUrl()}/api/notifications/unsubscribe?${params.toString()}`;
}
