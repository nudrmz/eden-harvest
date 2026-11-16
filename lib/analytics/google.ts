/**
 * Google Analytics 4 (and Google Ads, through GA4) with Google Consent Mode v2.
 * Nothing that sets cookies runs until the visitor accepts in the cookie banner.
 *
 * The Google tag ID comes from Google Ads / Analytics ("Install manually").
 * It isn't secret. A GTM-… container loads gtm.js (its destinations, such as
 * GA4 and Google Ads, are set up in Google); a G-… or AW-… ID loads gtag.js.
 * NEXT_PUBLIC_GOOGLE_TAG_ID in Vercel overrides the default below.
 */
export const GOOGLE_TAG_ID = (process.env.NEXT_PUBLIC_GOOGLE_TAG_ID?.trim() || "GTM-K4WXXSKS").toUpperCase();
export const GOOGLE_TAG_ENABLED = /^(GTM|G|AW|GT)-[A-Z0-9]+$/.test(GOOGLE_TAG_ID);

const CONSENT_KEY = "eh-cookie-consent";
export const CONSENT_EVENT = "eh-consent-change";
export type Consent = "granted" | "denied";

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    gtag?: Gtag;
    dataLayer?: unknown[];
  }
}

export function readConsent(): Consent | null {
  try {
    const v = window.localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function saveConsent(value: Consent | null): void {
  try {
    if (value) window.localStorage.setItem(CONSENT_KEY, value);
    else window.localStorage.removeItem(CONSENT_KEY);
  } catch {
    // Storage blocked: the choice applies to this visit only.
  }
  if (value) applyConsent(value);
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
}

export function applyConsent(value: Consent): void {
  const v = value === "granted" ? "granted" : "denied";
  window.gtag?.("consent", "update", {
    analytics_storage: v,
    ad_storage: v,
    ad_user_data: v,
    ad_personalization: v
  });
}

const ECOMMERCE_EVENTS = new Set(["begin_checkout", "purchase", "add_to_cart", "view_item"]);

/**
 * Send an event once the Google tag is loaded and the visitor accepted.
 * With a Tag Manager container (GTM-…) it's pushed to the dataLayer as a
 * custom event (ecommerce fields under "ecommerce", GA4's standard shape),
 * which GA4 / Google Ads tags in Tag Manager pick up with a Custom Event
 * trigger. With a plain gtag ID (G-… / AW-…) it's sent with gtag().
 */
export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined" || !window.gtag || readConsent() !== "granted") return;
  if (GOOGLE_TAG_ID.startsWith("GTM-")) {
    const dl = (window.dataLayer = window.dataLayer || []);
    if (ECOMMERCE_EVENTS.has(name)) {
      dl.push({ ecommerce: null });
      dl.push({ event: name, ecommerce: params });
    } else {
      dl.push({ event: name, ...params });
    }
    return;
  }
  window.gtag("event", name, params);
}

/** Fire a one-off event (e.g. a purchase) at most once per key on this device. */
export function trackOnce(key: string, name: string, params: Record<string, unknown> = {}): void {
  try {
    const k = `eh-tracked:${key}`;
    if (window.localStorage.getItem(k)) return;
    trackEvent(name, params);
    if (readConsent() === "granted") window.localStorage.setItem(k, "1");
  } catch {
    trackEvent(name, params);
  }
}
