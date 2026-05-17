import path from "path";
import type { Config } from "tailwindcss";

const root = process.cwd();

/** Some Windows glob stacks skip route-group folders; pin seller screens explicitly */
const sellerRoutes = [
  path.join(root, "app", "(seller)", "onboarding", "page.tsx"),
  path.join(root, "app", "(seller)", "dashboard", "page.tsx"),
  path.join(root, "app", "(seller)", "listings", "new", "page.tsx"),
  path.join(root, "app", "(seller)", "listings", "[id]", "edit", "page.tsx")
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
