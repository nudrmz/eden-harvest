import type { Metadata, Viewport } from "next";
import { DM_Sans, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { Providers } from "@/components/layout/Providers";
import { siteUrl } from "@/lib/site";
import { DEFAULT_DESCRIPTION, SITE_NAME, sharePreview } from "@/lib/seo/share";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap"
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap"
});

// Site-wide defaults inherited by pages without their own preview. No
// canonical/og:url here, or every such page would claim to be the home page.
const { alternates: _homeCanonical, ...homePreview } = sharePreview({
  title: "Eden Harvest — authentic African produce, direct from verified farms",
  description: DEFAULT_DESCRIPTION,
  path: "/"
});
if (homePreview.openGraph) delete (homePreview.openGraph as { url?: unknown }).url;
void _homeCanonical;

export const metadata: Metadata = {
  ...homePreview,
  // Resolves relative share-image URLs to absolute ones, which crawlers need.
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Eden Harvest — authentic African produce, direct from verified farms",
    template: `%s · ${SITE_NAME}`
  },
  applicationName: "Eden Harvest",
  // iOS ignores the manifest for home-screen launch, so it needs these too.
  appleWebApp: {
    capable: true,
    title: "Eden Harvest",
    statusBarStyle: "black"
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }]
  },
  formatDetection: { telephone: false }
};

export const viewport: Viewport = {
  themeColor: "#0f1f0f",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body
        className={`${plusJakarta.variable} ${dmSans.variable} font-body`}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
