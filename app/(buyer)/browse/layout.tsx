import type { Metadata } from "next";
import { sharePreview } from "@/lib/seo/share";

export const metadata: Metadata = sharePreview({
  title: "Browse African produce",
  description:
    "Grains, spices, dried goods, oils and more — browse listings from verified farms across Africa and message sellers directly.",
  path: "/browse"
});

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
