import data from "./links.json";

export interface CampaignLink {
  slug: string;
  label: string;
  destination: string;
  source: string;
  medium: string;
  audience: "buyers" | "sellers";
}

export const CAMPAIGN_LINKS = data.links as CampaignLink[];

/** First-touch attribution cookie: the first campaign that brought a visitor. */
export const FIRST_TOUCH_COOKIE = "eh_first_touch";
export const FIRST_TOUCH_DAYS = 90;

export interface FirstTouch {
  source: string;
  medium?: string;
  campaign?: string;
  landing?: string;
  at: string;
}

export function parseFirstTouch(raw: string | undefined | null): FirstTouch | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(decodeURIComponent(raw)) as FirstTouch;
    return value?.source ? value : null;
  } catch {
    return null;
  }
}

/** Metadata keys stored on the Supabase auth user (no schema change needed). */
export function firstTouchMetadata(touch: FirstTouch | null): Record<string, string> {
  if (!touch) return {};
  return {
    signup_source: touch.source,
    ...(touch.medium ? { signup_medium: touch.medium } : {}),
    ...(touch.campaign ? { signup_campaign: touch.campaign } : {}),
    signup_first_seen_at: touch.at
  };
}

export function readFirstTouchFromDocument(): FirstTouch | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${FIRST_TOUCH_COOKIE}=`));
  return parseFirstTouch(match?.slice(FIRST_TOUCH_COOKIE.length + 1));
}
