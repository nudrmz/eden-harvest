"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, MessageCircle } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { useTheme } from "@/components/layout/ThemeProvider";
import { createClient } from "@/lib/supabase/client";

interface ListingDetail {
  id: string;
  seller_id: string;
  product_name: string;
  category: string;
  description: string | null;
  price_local: number;
  price_currency_code: string;
  unit: string;
  min_order_quantity: number;
  min_order_unit: string;
  photo_url: string | null;
  stock_status: string;
  seasonal_months: number[] | null;
}

interface SellerSummary {
  id: string;
  farm_name: string;
  state_region: string;
  local_area: string | null;
  is_verified: boolean;
  average_rating: number;
}

const STATUS_LABELS: Record<string, string> = {
  in_season: "In season",
  bulk_available: "Bulk available",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
  new_listing: "New listing"
};

export default function ListingDetailPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const listingId = params.id;

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [seller, setSeller] = useState<SellerSummary | null>(null);
  const [countryLabel, setCountryLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [contacting, setContacting] = useState(false);
  const [enquirySent, setEnquirySent] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      setLoading(true);

      const { data: listingRow } = await supabase
        .from("listings")
        .select(
          `
          id,
          seller_id,
          product_name,
          category,
          description,
          price_local,
          price_currency_code,
          unit,
          min_order_quantity,
          min_order_unit,
          photo_url,
          stock_status,
          seasonal_months
        `
        )
        .eq("id", listingId)
        .eq("is_active", true)
        .maybeSingle();

      if (cancelled) return;

      if (!listingRow) {
        setListing(null);
        setSeller(null);
        setLoading(false);
        return;
      }

      setListing(listingRow as ListingDetail);

      const { data: sellerRow } = await supabase
        .from("seller_profiles")
        .select(
          "id, farm_name, state_region, local_area, is_verified, average_rating, african_country_id"
        )
        .eq("id", listingRow.seller_id)
        .maybeSingle();

      if (cancelled) return;

      if (sellerRow) {
        setSeller(sellerRow as SellerSummary);
        if (sellerRow.african_country_id) {
          const { data: country } = await supabase
            .from("african_countries")
            .select("name, flag_emoji")
            .eq("id", sellerRow.african_country_id)
            .maybeSingle();
          if (!cancelled && country) {
            setCountryLabel(`${country.flag_emoji} ${country.name}`);
          }
        }
      }

      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  const handleContact = async () => {
    if (!listing || !seller || contacting) return;

    setContacting(true);
    setContactError(null);

    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      setContacting(false);
      router.push(
        `/login?redirect=${encodeURIComponent(`/listing/${listing.id}`)}&message=${encodeURIComponent("Sign in to contact this seller.")}`
      );
      return;
    }

    const { error: enquiryError } = await supabase.from("enquiries").insert({
      buyer_id: user.id,
      seller_id: seller.id,
      listing_id: listing.id
    });

    if (enquiryError) {
      console.error("enquiry insert:", enquiryError.message);
    } else {
      setEnquirySent(true);
    }

    const { data: whatsapp, error: whatsappError } = await supabase.rpc(
      "get_seller_whatsapp",
      { seller_profile_id: seller.id }
    );

    setContacting(false);

    if (whatsappError || !whatsapp) {
      setContactError(
        whatsappError?.message ??
          "WhatsApp number unavailable. Complete seller onboarding or run the WhatsApp migration."
      );
      return;
    }

    const phone = String(whatsapp).replace(/\D/g, "");
    if (!phone) {
      setContactError("Seller WhatsApp number is invalid.");
      return;
    }

    const message = encodeURIComponent(
      `Hi ${seller.farm_name}, I found you on Eden Harvest and I'm interested in ${listing.product_name}.`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };

  if (loading) {
    return (
      <main className="app-shell mx-auto flex min-h-screen w-full max-w-md items-center justify-center">
        <p className="text-sm text-white/50">Loading listing…</p>
      </main>
    );
  }

  if (!listing) {
    return (
      <main className="app-shell mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-white/50">Listing not found.</p>
        <Link href="/browse" className="text-sm font-semibold text-[#1D9E75]">
          Back to browse
        </Link>
        <MobileBottomNav active="browse" />
      </main>
    );
  }

  const seasonBar =
    listing.seasonal_months?.length === 12
      ? listing.seasonal_months
      : Array(12).fill(0);

  return (
    <main className="app-shell mx-auto min-h-screen w-full max-w-md pb-24">
      <section className="relative h-[260px] overflow-hidden">
        {listing.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.photo_url}
            alt={listing.product_name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/images/hero-farmers.png')" }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/35 to-black/75" />
        <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="glass-card flex h-10 w-10 items-center justify-center rounded-full"
            aria-label="Go back"
          >
            <ArrowLeft size={16} />
          </button>
          <span className="rounded-full bg-black/35 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
            {STATUS_LABELS[listing.stock_status] ?? listing.stock_status}
          </span>
        </div>
      </section>

      <section className="relative -mt-8 px-4">
        <div className="glass-card p-4">
          <p className="text-[11px] uppercase tracking-wide text-white/55">{listing.category}</p>
          <h1
            className={`font-heading mt-1 text-[22px] font-bold ${theme === "dark" ? "text-white" : "text-[#1A1A18]"}`}
          >
            {listing.product_name}
          </h1>
          <p className="mt-2 text-xl font-semibold text-eden-gold">
            {listing.price_currency_code} {Number(listing.price_local).toLocaleString()}
            <span className="text-sm font-normal text-white/55"> / {listing.unit}</span>
          </p>
          <p className={`mt-1 text-xs ${theme === "dark" ? "text-white/60" : "text-[#444441]"}`}>
            Min order: {listing.min_order_quantity} {listing.min_order_unit}
          </p>

          {seller ? (
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
              <div>
                <p className={`text-sm font-semibold ${theme === "dark" ? "text-white" : "text-[#1A1A18]"}`}>
                  {seller.farm_name}
                </p>
                <p className="mt-0.5 text-[11px] text-white/55">
                  {countryLabel}
                  {countryLabel ? " · " : ""}
                  {seller.local_area ? `${seller.local_area}, ` : ""}
                  {seller.state_region}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  {seller.is_verified ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-eden-gold/35 bg-eden-gold/15 px-2 py-0.5 text-[10px] font-semibold text-eden-gold">
                      <CheckCircle2 size={11} />
                      Verified
                    </span>
                  ) : (
                    <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] text-white/60">
                      Pending verification
                    </span>
                  )}
                </div>
              </div>
              <Link
                href={`/seller/${seller.id}`}
                className="shrink-0 rounded-xl border border-white/15 px-3 py-2 text-[11px] font-medium text-[#5DCAA5]"
              >
                View profile
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      {listing.description ? (
        <section className="px-4 pt-4">
          <div className="glass-card p-4">
            <h2 className={`eden-section-title ${theme === "dark" ? "text-white" : "text-[#1A1A18]"}`}>
              About this produce
            </h2>
            <p className={`mt-2 text-sm leading-relaxed ${theme === "dark" ? "text-white/70" : "text-[#444441]"}`}>
              {listing.description}
            </p>
          </div>
        </section>
      ) : null}

      <section className="px-4 pt-4">
        <div className="glass-card p-4">
          <h2 className={`eden-section-title ${theme === "dark" ? "text-white" : "text-[#1A1A18]"}`}>
            Seasonal availability
          </h2>
          <div className="mt-3 flex gap-1">
            {seasonBar.map((month, idx) => (
              <span
                key={`season-${idx}`}
                className={`h-2 flex-1 rounded-full ${month ? "bg-eden-gold" : "bg-white/15"}`}
              />
            ))}
          </div>
          <p className="mt-2 text-[10px] text-white/45">Gold segments = typically available months</p>
        </div>
      </section>

      <section className="px-4 pt-4">
        <button
          type="button"
          onClick={() => void handleContact()}
          disabled={contacting || !seller}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3.5 text-sm font-semibold text-[#092012] disabled:opacity-60"
        >
          <MessageCircle size={16} />
          {contacting
            ? "Opening WhatsApp…"
            : enquirySent
              ? "Contacted on WhatsApp"
              : "Contact on WhatsApp"}
        </button>
        {contactError ? <p className="mt-2 text-[11px] text-[#F09595]">{contactError}</p> : null}
        <p className="mt-2 text-center text-[11px] text-white/45">
          Opens WhatsApp with this produce pre-filled. An enquiry is logged for the seller.
        </p>
      </section>

      <MobileBottomNav active="browse" />
    </main>
  );
}
