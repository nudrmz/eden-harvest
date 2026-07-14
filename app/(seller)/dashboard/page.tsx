"use client";

import Link from "next/link";
import { Bell, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useTheme } from "@/components/layout/ThemeProvider";
import { useAuth } from "@/lib/supabase/hooks";
import { createClient } from "@/lib/supabase/client";

interface SellerListingRow {
  id: string;
  product_name: string;
  category: string;
  price_local: number;
  price_currency_code: string;
  unit: string;
  stock_status: string;
  is_active: boolean;
}

interface EnquiryRow {
  id: string;
  created_at: string;
  listing_id: string;
  listings?: { product_name?: string } | null;
}

const glass =
  "rounded-2xl bg-[rgba(10,20,10,0.88)] border border-[rgba(255,255,255,0.12)] shadow-[0_8px_24px_rgba(0,0,0,0.35)]";

const fieldArea =
  "mt-3 w-full resize-none rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] px-3 py-2.5 text-sm text-[rgba(255,255,255,0.9)] placeholder:text-[rgba(255,255,255,0.35)] focus:border-[#1D9E75] focus:outline-none";

export default function SellerDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const textPrimary = isDark ? "text-white" : "text-[#1A1A18]";
  const textSecondary = isDark ? "text-[rgba(255,255,255,0.6)]" : "text-[#444441]";
  const textTertiary = isDark ? "text-[rgba(255,255,255,0.5)]" : "text-[#9C9C95]";

  const [farmName, setFarmName] = useState<string>("");
  const [isVerified, setIsVerified] = useState(false);
  const [listings, setListings] = useState<SellerListingRow[]>([]);
  const [enquiries, setEnquiries] = useState<EnquiryRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoadingData(false);
      return;
    }

    const supabase = createClient();
    let cancelled = false;

    async function loadDashboard() {
      setLoadingData(true);

      const { data: sellerProfile } = await supabase
        .from("seller_profiles")
        .select("id, farm_name, is_verified, average_rating")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (cancelled) return;

      if (!sellerProfile) {
        setFarmName(user!.full_name?.split(" ")[0] ?? "");
        setListings([]);
        setEnquiries([]);
        setLoadingData(false);
        return;
      }

      setFarmName(sellerProfile.farm_name as string);
      setIsVerified(Boolean(sellerProfile.is_verified));

      const [{ data: listingRows }, { data: enquiryRows }] = await Promise.all([
        supabase
          .from("listings")
          .select(
            "id, product_name, category, price_local, price_currency_code, unit, stock_status, is_active"
          )
          .eq("seller_id", sellerProfile.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("enquiries")
          .select("id, created_at, listing_id, listings(product_name)")
          .eq("seller_id", sellerProfile.id)
          .order("created_at", { ascending: false })
          .limit(10)
      ]);

      if (cancelled) return;

      setListings((listingRows as SellerListingRow[]) ?? []);
      setEnquiries((enquiryRows as EnquiryRow[]) ?? []);
      setLoadingData(false);
    }

    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const activeListings = listings.filter((l) => l.is_active);

  return (
    <main className="eden-seller-shell app-shell font-body mx-auto min-h-screen w-full max-w-md pb-28 antialiased">
      <header className="sticky top-0 z-10 border-b border-[var(--card-border)] bg-[var(--glass-bg)] px-4 pb-4 pt-5 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={`text-xs ${textSecondary}`}>Seller hub</p>
            <h1 className={`font-heading mt-2 text-2xl font-bold leading-snug ${textPrimary}`}>
              Welcome,{" "}
              {authLoading || loadingData
                ? "…"
                : (user?.full_name?.split(" ")[0] ?? farmName) || "Seller"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              className={`${glass} flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--text-primary)]`}
              aria-label="Notifications"
            >
              <Bell size={18} className="text-[var(--text-primary)]" />
            </button>
          </div>
        </div>
      </header>

      <div className="space-y-5 px-4 pt-5">
        <section className={`${glass} p-4`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className={`text-[11px] uppercase tracking-wide ${textSecondary}`}>
                Verification status
              </p>
              <p className={`mt-1 font-heading text-base font-semibold ${textPrimary}`}>
                {isVerified ? "Verified seller" : "Pending verification"}
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                isVerified
                  ? "bg-[rgba(29,158,117,0.18)] text-[#5DCAA5]"
                  : "bg-[rgba(250,199,117,0.18)] text-[#FAC775]"
              }`}
            >
              {isVerified ? "Verified" : "Pending"}
            </span>
          </div>
          <p className={`mt-3 text-xs leading-relaxed ${textSecondary}`}>
            {isVerified
              ? "Buyers can see your verified badge across Eden Harvest."
              : "Our team reviews new farms within 48 hours. You can still publish listings meanwhile."}
          </p>
        </section>

        <section className="grid grid-cols-3 gap-2">
          <div className={`${glass} p-2.5 text-center`}>
            <p className={`text-[10px] ${textSecondary}`}>Listings</p>
            <p className={`mt-1 text-sm font-semibold ${textPrimary}`}>
              {loadingData ? "…" : activeListings.length}
            </p>
          </div>
          <div className={`${glass} p-2.5 text-center`}>
            <p className={`text-[10px] ${textSecondary}`}>Enquiries</p>
            <p className={`mt-1 text-sm font-semibold ${textPrimary}`}>
              {loadingData ? "…" : enquiries.length}
            </p>
          </div>
          <div className={`${glass} p-2.5 text-center`}>
            <p className={`text-[10px] ${textSecondary}`}>Status</p>
            <p className="mt-1 text-sm font-semibold text-[#9FE1CB]">
              {activeListings.length ? "Live" : "New"}
            </p>
          </div>
        </section>

        <Link
          href="/seller/listings/new"
          className={`${glass} flex min-h-[120px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#1D9E75]/55 p-6 text-center transition hover:border-[#1D9E75] hover:bg-[rgba(12,26,14,0.55)]`}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(29,158,117,0.2)] text-[#1D9E75]">
            <Plus size={28} strokeWidth={2.25} />
          </div>
          <p className={`eden-section-title ${textPrimary}`}>
            {activeListings.length ? "Add another listing" : "Add your first listing"}
          </p>
          <p className={`text-xs ${textTertiary}`}>
            Photos, pricing in local currency, stock status
          </p>
        </Link>

        <section className={`${glass} p-4`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className={`eden-section-title ${textPrimary}`}>Your listings</h2>
            <Link href="/browse" className={`text-xs ${textSecondary}`}>
              View marketplace
            </Link>
          </div>
          {loadingData ? (
            <p className={`text-center text-sm ${textSecondary}`}>Loading listings…</p>
          ) : activeListings.length === 0 ? (
            <p className={`text-center text-sm ${textSecondary}`}>
              No listings yet. Publish one and buyers will see it on the home page.
            </p>
          ) : (
            <div className="space-y-2">
              {activeListings.map((listing) => (
                <div
                  key={listing.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"
                >
                  <div>
                    <p className={`text-sm font-semibold ${textPrimary}`}>{listing.product_name}</p>
                    <p className={`text-[11px] ${textTertiary}`}>{listing.category}</p>
                  </div>
                  <p className="text-sm font-semibold text-[#5DCAA5]">
                    {listing.price_currency_code}{" "}
                    {Number(listing.price_local).toLocaleString()}
                    <span className={`text-[11px] font-normal ${textTertiary}`}>
                      /{listing.unit}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={`${glass} p-4`}>
          <h2 className={`eden-section-title ${textPrimary}`}>Recent enquiries</h2>
          {loadingData ? (
            <p className={`mt-4 text-center text-sm ${textSecondary}`}>Loading…</p>
          ) : enquiries.length === 0 ? (
            <p className={`mt-4 text-center text-sm ${textSecondary}`}>
              No enquiries yet. Once buyers contact you on WhatsApp, they&apos;ll appear here.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {enquiries.map((enquiry) => (
                <div
                  key={enquiry.id}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"
                >
                  <p className={`text-sm font-medium ${textPrimary}`}>
                    {enquiry.listings?.product_name ?? "Listing enquiry"}
                  </p>
                  <p className={`mt-0.5 text-[11px] ${textTertiary}`}>
                    {new Date(enquiry.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={`${glass} p-4`}>
          <h2 className={`eden-section-title ${textPrimary}`}>Sale stories</h2>
          <p className={`mt-1 text-xs ${textTertiary}`}>Share what&apos;s happening on your farm</p>
          <textarea
            readOnly
            rows={3}
            placeholder="Harvest updates, new certifications, bulk availability…"
            className={fieldArea}
          />
        </section>
      </div>

      <MobileBottomNav active="sell" />
    </main>
  );
}
