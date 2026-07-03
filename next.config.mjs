import withPWA from "next-pwa";

const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
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
