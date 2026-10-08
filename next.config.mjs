import { readFileSync } from "node:fs";
import withPWA from "next-pwa";

/**
 * Campaign short links (lib/campaigns/links.json): edenharvest.app/uk etc.
 * redirect to their destination with UTM tags, which CampaignCapture turns
 * into a first-touch cookie for sign-up attribution.
 */
const RESERVED_SLUGS = new Set([
  "api", "admin", "auth", "browse", "dashboard", "listing", "listings", "login",
  "messages", "onboarding", "profile", "register", "seller", "settings", "upgrade",
  "forgot-password", "reset-password", "icons", "images", "og", "manifest.webmanifest"
]);
function campaignRedirects() {
  const { links } = JSON.parse(
    readFileSync(new URL("./lib/campaigns/links.json", import.meta.url), "utf8")
  );
  return links.map((link) => {
    if (!/^[a-z0-9-]+$/.test(link.slug) || RESERVED_SLUGS.has(link.slug)) {
      throw new Error(`Campaign slug "${link.slug}" is invalid or clashes with a page.`);
    }
    const [path, query = ""] = link.destination.split("?");
    const params = new URLSearchParams(query);
    params.set("utm_source", link.source);
    params.set("utm_medium", link.medium);
    params.set("utm_campaign", link.slug);
    return {
      source: `/${link.slug}`,
      destination: `${path}?${params.toString()}`,
      permanent: false
    };
  });
}

/**
 * Once NEXT_PUBLIC_SITE_URL points at the custom domain, send visitors on the
 * old eden-harvest.vercel.app address there too, so links, QR codes and the
 * installed app all converge on one origin. /api is left alone: Stripe and
 * Stream webhooks don't follow redirects.
 */
const LEGACY_HOST = "eden-harvest.vercel.app";
function canonicalHostRedirects() {
  let target;
  try {
    target = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "");
  } catch {
    return [];
  }
  if (!target.hostname || target.hostname === LEGACY_HOST) return [];
  return [
    {
      source: "/:path((?!api/).*)",
      has: [{ type: "host", value: LEGACY_HOST }],
      destination: `${target.origin}/:path`,
      permanent: false
    }
  ];
}

const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      ...canonicalHostRedirects(),
      ...campaignRedirects(),
      {
        source: "/listings/new",
        destination: "/seller/listings/new",
        permanent: false
      },
      {
        source: "/listings/:id/edit",
        destination: "/seller/listings/:id/edit",
        permanent: false
      }
    ];
  }
};

/** PWA is dev-disabled only. On Vercel, next-pwa SW has caused stale/cached JS chunks and dead clicks. */
const pwaDisabled =
  process.env.NODE_ENV === "development" || process.env.VERCEL === "1";

export default pwaDisabled
  ? nextConfig
  : withPWA({
      dest: "public",
      disable: false
    })(nextConfig);
