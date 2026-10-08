"use client";

import { useEffect } from "react";
import { FIRST_TOUCH_COOKIE, FIRST_TOUCH_DAYS, readFirstTouchFromDocument } from "@/lib/campaigns";

/**
 * Remember the first campaign (utm_* tags) a visitor arrived from, so a later
 * sign-up can be credited to it. First touch wins: later visits from other
 * links don't overwrite it. Stored as a cookie so the server-side Google
 * sign-in callback can read it too.
 */
export function CampaignCapture() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const source = params.get("utm_source");
      if (!source || readFirstTouchFromDocument()) return;

      const value = encodeURIComponent(
        JSON.stringify({
          source: source.slice(0, 60),
          medium: params.get("utm_medium")?.slice(0, 60) ?? undefined,
          campaign: params.get("utm_campaign")?.slice(0, 60) ?? undefined,
          landing: window.location.pathname.slice(0, 120),
          at: new Date().toISOString()
        })
      );
      const maxAge = FIRST_TOUCH_DAYS * 24 * 60 * 60;
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${FIRST_TOUCH_COOKIE}=${value}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
    } catch {
      /* attribution is best-effort */
    }
  }, []);

  return null;
}
