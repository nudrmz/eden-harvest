"use client";

import Script from "next/script";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CONSENT_EVENT,
  GOOGLE_TAG_ENABLED,
  GOOGLE_TAG_ID,
  applyConsent,
  readConsent,
  saveConsent
} from "@/lib/analytics/google";
import { isAdminDevice } from "@/lib/analytics/adminDevice";

function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const sync = () => setShow(readConsent() === null);
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  if (!show) return null;
  return (
    <div
      role="dialog"
      aria-label="Cookie choices"
      className="fixed inset-x-3 bottom-24 z-[60] mx-auto max-w-md rounded-2xl border border-white/15 bg-[#0f1f0f]/95 p-4 text-sm text-white shadow-2xl backdrop-blur md:bottom-6"
    >
      <p className="font-semibold">Cookies on Eden Harvest</p>
      <p className="mt-1 text-white/70">
        We&apos;d like to use Google cookies to see how people find and use Eden Harvest and to measure our ads. Essential
        sign-in cookies are always on. <Link href="/privacy#cookies" className="underline">More info</Link>
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => saveConsent("denied")} className="rounded-xl border border-white/20 py-2.5 font-semibold">
          Reject
        </button>
        <button type="button" onClick={() => saveConsent("granted")} className="rounded-xl bg-[#1D9E75] py-2.5 font-semibold">
          Accept
        </button>
      </div>
    </div>
  );
}

/**
 * The Google tag (Analytics + Ads) with Consent Mode v2: everything starts
 * "denied" and only switches on when the visitor accepts. Not loaded at all on
 * admin pages or admins' own devices, so their visits aren't counted. Page
 * changes are tracked by GA4's own enhanced measurement.
 */
export function GoogleAnalytics() {
  const pathname = usePathname();
  const [load, setLoad] = useState(false);

  useEffect(() => {
    if (!GOOGLE_TAG_ENABLED || pathname.startsWith("/admin") || isAdminDevice()) return;
    setLoad(true);
  }, [pathname]);

  useEffect(() => {
    const c = readConsent();
    if (c && load) applyConsent(c);
  }, [load]);

  if (!GOOGLE_TAG_ENABLED) return null;
  const isContainer = GOOGLE_TAG_ID.startsWith("GTM-");
  return (
    <>
      {load ? (
        <>
          <Script id="google-consent-default" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});
try{if(localStorage.getItem('eh-cookie-consent')==='granted'){gtag('consent','update',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted',analytics_storage:'granted'});}}catch(e){}
gtag('js',new Date());
${isContainer ? "" : `gtag('config','${GOOGLE_TAG_ID}');`}`}
          </Script>
          <Script
            id="google-tag"
            strategy="afterInteractive"
            src={
              isContainer
                ? `https://www.googletagmanager.com/gtm.js?id=${GOOGLE_TAG_ID}`
                : `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_TAG_ID}`
            }
          />
        </>
      ) : null}
      <CookieBanner />
    </>
  );
}

/** Reopens the cookie choice (used on the Privacy page). */
export function CookieSettingsButton() {
  if (!GOOGLE_TAG_ENABLED) return null;
  return (
    <button type="button" onClick={() => saveConsent(null)} className="font-semibold text-eden-gold underline">
      Change cookie settings
    </button>
  );
}
