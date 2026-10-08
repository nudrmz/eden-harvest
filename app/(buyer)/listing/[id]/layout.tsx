import type { Metadata } from "next";
import {
  clip,
  formatLocalPrice,
  publicSupabase,
  sharePreview
} from "@/lib/seo/share";

// Listing edits show up in new share previews within 5 minutes.
export const revalidate = 300;

interface Props {
  params: { id: string };
  children: React.ReactNode;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const path = `/listing/${params.id}`;
  const fallback = sharePreview({
    title: "Produce listing",
    description: "Authentic African produce, direct from verified farms.",
    path
  });

  const supabase = publicSupabase();
  if (!supabase) return fallback;

  const { data: listing } = await supabase
    .from("listings")
    .select(
      "product_name, description, price_local, price_currency_code, unit, photo_url, seller_id"
    )
    .eq("id", params.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!listing) return fallback;

  const { data: seller } = await supabase
    .from("seller_profiles")
    .select("farm_name, state_region, is_verified, african_countries(name, flag_emoji)")
    .eq("id", listing.seller_id)
    .maybeSingle();

  const country = (seller?.african_countries ?? null) as
    | { name: string; flag_emoji: string }
    | { name: string; flag_emoji: string }[]
    | null;
  const countryRow = Array.isArray(country) ? country[0] : country;

  const price = formatLocalPrice(listing.price_local, listing.price_currency_code);
  const title = price
    ? `${listing.product_name} — ${price}${listing.unit ? ` per ${listing.unit}` : ""}`
    : listing.product_name;

  const where = [seller?.state_region, countryRow?.name].filter(Boolean).join(", ");
  const from = seller
    ? `From ${seller.farm_name}${where ? `, ${where}` : ""}${countryRow ? ` ${countryRow.flag_emoji}` : ""}${seller.is_verified ? " · Verified seller" : ""}.`
    : "";
  const description = clip(
    [from, listing.description ?? "Authentic African produce on Eden Harvest."]
      .filter(Boolean)
      .join(" ")
  );

  return sharePreview({
    title,
    description,
    path,
    image: listing.photo_url,
    imageAlt: listing.product_name
  });
}

export default function ListingLayout({ children }: Props) {
  return children;
}
