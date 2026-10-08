import withPWA from "next-pwa";

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
