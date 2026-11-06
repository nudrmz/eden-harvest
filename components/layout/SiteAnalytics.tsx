"use client";

import { Analytics } from "@vercel/analytics/next";
import { isAdminDevice } from "@/lib/analytics/adminDevice";

/** Vercel Web Analytics, skipping admin pages and admins' own devices. */
export function SiteAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        if (isAdminDevice()) return null;
        try {
          if (new URL(event.url).pathname.startsWith("/admin")) return null;
        } catch {
          // Keep the event if the URL can't be read.
        }
        return event;
      }}
    />
  );
}
