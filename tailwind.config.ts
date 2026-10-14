import path from "path";
import type { Config } from "tailwindcss";

const root = process.cwd();

/** Some Windows glob stacks skip route-group folders; pin seller screens explicitly */
const sellerRoutes = [
  path.join(root, "app", "(seller)", "onboarding", "page.tsx"),
  path.join(root, "app", "(seller)", "dashboard", "page.tsx"),
  path.join(root, "app", "seller", "listings", "new", "page.tsx"),
  path.join(root, "app", "seller", "listings", "[id]", "edit", "page.tsx")
].map((absFile) => absFile.replace(/\\/g, "/"));

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/(buyer)/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/(seller)/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/(auth)/**/*.{js,ts,jsx,tsx,mdx}",
    // Explicit files (parentheses + Windows path normalization)
    "./app/(seller)/onboarding/page.tsx",
    "./app/(seller)/dashboard/page.tsx",
    ...sellerRoutes
  ],
  theme: {
    extend: {
      // Scaled by --fs / --fs-small (see globals.css) so text can be enlarged
      // on phones without changing spacing. Unitless line heights scale with it.
      fontSize: {
        xs: ["calc(0.75rem * var(--fs-small))", { lineHeight: "1.3333" }],
        sm: ["calc(0.875rem * var(--fs))", { lineHeight: "1.4286" }],
        base: ["calc(1rem * var(--fs))", { lineHeight: "1.5" }],
        lg: ["calc(1.125rem * var(--fs))", { lineHeight: "1.5556" }],
        xl: ["calc(1.25rem * var(--fs))", { lineHeight: "1.4" }],
        "2xl": ["calc(1.5rem * var(--fs))", { lineHeight: "1.3333" }],
        "3xl": ["calc(1.875rem * var(--fs))", { lineHeight: "1.2" }],
        "4xl": ["calc(2.25rem * var(--fs))", { lineHeight: "1.1111" }]
      },
      colors: {
        eden: {
          bg: "#0f1f0f",
          primary: "#1D9E75",
          gold: "#F5C442",
          glass: "rgba(10,20,10,0.88)",
          border: "rgba(255,255,255,0.12)",
          stock: {
            inSeason: "#5DCAA5",
            bulk: "#FAC775",
            low: "#F09595"
          }
        }
      },
      borderRadius: {
        eden: "16px"
      },
      boxShadow: {
        glass: "0 8px 24px rgba(0, 0, 0, 0.35)"
      },
      fontFamily: {
        heading: ["var(--font-plus-jakarta)", "sans-serif"],
        body: ["var(--font-dm-sans)", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
