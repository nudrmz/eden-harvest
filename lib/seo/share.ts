import "server-only";
import type { Metadata } from "next";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Link-preview (Open Graph / Twitter) metadata. WhatsApp, Facebook, iMessage,
 * Slack and X all read these tags when a link is pasted into a chat.
 *
 * Next.js replaces — not merges — a parent's openGraph object when a page
 * sets its own, so every page goes through sharePreview() to keep siteName,
 * locale and the fallback image.
 */

export const SITE_NAME = "Eden Harvest";
export const DEFAULT_DESCRIPTION =
  "Authentic African produce, direct from verified farms. Browse, compare and message sellers in Nigeria, Ghana, Kenya and beyond.";
export const DEFAULT_SHARE_IMAGE = {
  url: "/og/default.jpg",
  width: 1200,
  height: 630,
  alt: "Eden Harvest — authentic African produce, direct from verified farms"
};

export function sharePreview(opts: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  imageAlt?: string;
}): Metadata {
  const images = opts.image
    ? [{ url: opts.image, alt: opts.imageAlt ?? opts.title }]
    : [DEFAULT_SHARE_IMAGE];

  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: opts.path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_GB",
      url: opts.path,
      title: opts.title,
      description: opts.description,
      images
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
      images: images.map((i) => i.url)
    }
  };
}

/**
 * Cookie-less anon client: share crawlers have no session, and avoiding
 * cookies() keeps these lookups from forcing the page fully dynamic.
 */
export function publicSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export function formatLocalPrice(amount: number | null, currency: string | null): string | null {
  if (amount == null || !currency) return null;
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en-GB")}`;
  }
}

/** Keep descriptions inside what WhatsApp/Facebook show (~150 chars). */
export function clip(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}
