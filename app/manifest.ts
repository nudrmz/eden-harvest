import type { MetadataRoute } from "next";

/**
 * Web app manifest — makes the site installable ("Add to Home Screen") so it
 * opens full-screen from a home-screen icon like a native app.
 *
 * Deliberately no service worker: installability no longer requires one in
 * current Chrome/Edge/Safari, and next-pwa's caching caused stale-chunk bugs
 * on Vercel (see Providers.tsx ServiceWorkerCleanup).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Eden Harvest",
    short_name: "Eden Harvest",
    description:
      "Buy authentic African produce direct from verified farms — for buyers in the UK, US, Canada, Australia and beyond.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f1f0f",
    theme_color: "#0f1f0f",
    categories: ["shopping", "food", "business"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ],
    shortcuts: [
      { name: "Browse produce", url: "/browse?source=pwa-shortcut" },
      { name: "Messages", url: "/messages?source=pwa-shortcut" },
      { name: "Sell on Eden Harvest", url: "/onboarding?source=pwa-shortcut" }
    ]
  };
}
