"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/**
 * Tracking links for ads and posts: edenharvest.app/go/youtube, /go/tiktok, …
 * The visit to /go/<source> is counted by Web Analytics (it shows under
 * "Ad & campaign links" on Admin → Analytics), then the visitor is taken to
 * the home page.
 */
export default function CampaignLinkPage() {
  const params = useParams<{ source: string }>();
  const router = useRouter();
  const source = String(params?.source ?? "link").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40) || "link";

  useEffect(() => {
    try {
      window.sessionStorage.setItem("eh-source", source);
    } catch {
      // Storage blocked: the visit is still counted.
    }
    // Give the analytics script a moment to record this page before moving on.
    const t = window.setTimeout(() => {
      router.replace(`/?utm_source=${encodeURIComponent(source)}&utm_medium=link`);
    }, 1200);
    return () => window.clearTimeout(t);
  }, [router, source]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0f1f0f] px-6 text-center text-white">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1D9E75]/30 border-t-[#1D9E75]" />
      <p className="font-heading text-lg font-semibold">Opening Eden Harvest…</p>
      <p className="text-sm text-white/60">Authentic African produce, direct from verified farms</p>
    </main>
  );
}
