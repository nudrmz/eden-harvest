import type { Metadata } from "next";
import { clip, publicSupabase, sharePreview } from "@/lib/seo/share";

export const revalidate = 300;

interface Props {
  params: { id: string };
  children: React.ReactNode;
}

const COLUMNS =
  "id, farm_name, state_region, local_area, farm_photo_url, is_verified, african_countries(name, flag_emoji)";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const path = `/seller/${params.id}`;
  const fallback = sharePreview({
    title: "Farm profile",
    description: "Authentic African produce, direct from verified farms.",
    path
  });

  const supabase = publicSupabase();
  if (!supabase) return fallback;

  // Same lookup order as the page: seller_profiles.id, then legacy user_id links.
  let { data: seller } = await supabase
    .from("seller_profiles")
    .select(COLUMNS)
    .eq("id", params.id)
    .maybeSingle();
  if (!seller) {
    ({ data: seller } = await supabase
      .from("seller_profiles")
      .select(COLUMNS)
      .eq("user_id", params.id)
      .maybeSingle());
  }
  if (!seller) return fallback;

  const { count } = await supabase
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("seller_id", seller.id)
    .eq("is_active", true);

  const country = seller.african_countries as
    | { name: string; flag_emoji: string }
    | { name: string; flag_emoji: string }[]
    | null;
  const countryRow = Array.isArray(country) ? country[0] : country;

  const where = [seller.local_area, seller.state_region, countryRow?.name]
    .filter(Boolean)
    .join(", ");
  const title = `${seller.farm_name}${countryRow ? ` ${countryRow.flag_emoji}` : ""}`;
  const description = clip(
    [
      seller.is_verified ? "Verified farm" : "Farm",
      where ? `in ${where}.` : ".",
      count ? `${count} product${count === 1 ? "" : "s"} listed on Eden Harvest.` : "Selling on Eden Harvest."
    ].join(" ").replace(" .", ".")
  );

  return sharePreview({
    title,
    description,
    path,
    image: seller.farm_photo_url,
    imageAlt: seller.farm_name
  });
}

export default function SellerLayout({ children }: Props) {
  return children;
}
