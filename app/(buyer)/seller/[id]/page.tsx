"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Flag, MessageSquare, Share2, Star, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { useTheme } from "@/components/layout/ThemeProvider";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/supabase/hooks";

interface SellerProfile {
  id: string;
  user_id: string;
  farm_name: string;
  state_region: string;
  local_area: string | null;
  farm_photo_url: string | null;
  is_verified: boolean;
  average_rating: number;
  total_reviews: number;
}

interface SellerListing {
  id: string;
  product_name: string;
  category: string;
  price_local: number;
  price_currency_code: string;
  unit: string;
}

function renderStars(value: number) {
  const full = Math.round(value);
  return Array.from({ length: 5 }, (_, index) => (
    <Star
      key={`star-${index}`}
      size={12}
      className={index < full ? "fill-eden-gold text-eden-gold" : "text-white/25"}
    />
  ));
}

export default function SellerProfilePage() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const sellerId = params.id;
  const { isVerifiedAccess } = useAuth();

  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [listings, setListings] = useState<SellerListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [messaging, setMessaging] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function fetchSeller() {
      setLoading(true);

      // Cards link with seller_profiles.id; keep user_id fallback for old links.
      let { data: profile } = await supabase
        .from("seller_profiles")
        .select(
          "id, user_id, farm_name, state_region, local_area, farm_photo_url, is_verified, average_rating, total_reviews"
        )
        .eq("id", sellerId)
        .maybeSingle();

      if (!profile) {
        const byUser = await supabase
          .from("seller_profiles")
          .select(
            "id, user_id, farm_name, state_region, local_area, farm_photo_url, is_verified, average_rating, total_reviews"
          )
          .eq("user_id", sellerId)
          .maybeSingle();
        profile = byUser.data;
      }

      if (cancelled) return;

      if (!profile) {
        setSeller(null);
        setListings([]);
        setLoading(false);
        return;
      }

      setSeller(profile as SellerProfile);

      const { data: sellerListings } = await supabase
        .from("listings")
        .select("id, product_name, category, price_local, price_currency_code, unit")
        .eq("seller_id", profile.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(8);

      if (!cancelled) {
        setListings((sellerListings as SellerListing[]) ?? []);
        setLoading(false);
      }
    }

    void fetchSeller();
    return () => {
      cancelled = true;
    };
  }, [sellerId]);

  const handleMessageInApp = async () => {
    if (!seller || messaging) return;

    setMessaging(true);
    setMessageError(null);

    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      setMessaging(false);
      router.push(
        `/login?redirect=${encodeURIComponent(`/seller/${seller.id}`)}&message=${encodeURIComponent("Sign in to message this seller.")}`
      );
      return;
    }

    try {
      const response = await fetch("/api/chat/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerProfileId: seller.id, listingId: listings[0]?.id })
      });
      const data = (await response.json()) as { channelId?: string; error?: string };

      if (!response.ok || !data.channelId) {
        setMessageError(data.error ?? "Could not start conversation.");
        return;
      }

      router.push(`/messages?channel=${data.channelId}`);
    } catch {
      setMessageError("Could not start conversation.");
    } finally {
      setMessaging(false);
    }
  };

  if (loading) {
    return (
      <main className="app-shell mx-auto flex min-h-screen w-full max-w-md items-center justify-center">
        <p className="text-sm text-white/50">Loading seller profile...</p>
      </main>
    );
  }

  if (!seller) {
    return (
      <main className="app-shell mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-white/50">Seller not found.</p>
        <Link href="/browse" className="text-sm font-semibold text-[#1D9E75]">
          Back to browse
        </Link>
        <MobileBottomNav active="browse" />
      </main>
    );
  }

  return (
    <main className="app-shell mx-auto min-h-screen w-full max-w-md pb-24">
      <section className="relative h-[250px] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: seller.farm_photo_url
              ? `url('${seller.farm_photo_url}')`
              : "url('/images/hero-farmers.png')"
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/70" />
        <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="glass-card flex h-10 w-10 items-center justify-center rounded-full"
          >
            <ArrowLeft size={16} />
          </button>
          <button type="button" className="glass-card flex h-10 w-10 items-center justify-center rounded-full">
            <Share2 size={16} />
          </button>
        </div>
      </section>

      <section className="relative -mt-8 px-4">
        <div className="glass-card p-4">
          <h1
            className={`font-heading text-[20px] font-bold ${theme === "dark" ? "text-white" : "text-[#1A1A18]"}`}
          >
            {seller.farm_name}
          </h1>
          <p className={`mt-1 text-xs ${theme === "dark" ? "text-white/65" : "text-[#444441]"}`}>
            {seller.local_area ? `${seller.local_area}, ` : ""}
            {seller.state_region}
          </p>
          <div className="mt-3 flex items-center gap-2">
            {seller.is_verified ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-eden-gold/35 bg-eden-gold/15 px-2.5 py-1 text-[10px] font-semibold text-eden-gold">
                <CheckCircle2 size={12} />
                Verified seller
              </span>
            ) : (
              <span
                className={`rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] ${theme === "dark" ? "text-white/65" : "text-[#444441]"}`}
              >
                Pending verification
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-2xl font-semibold">{Number(seller.average_rating || 0).toFixed(1)}</span>
            <div className="flex items-center gap-0.5">{renderStars(Number(seller.average_rating || 0))}</div>
            <span className={`text-xs ${theme === "dark" ? "text-white/60" : "text-[#444441]"}`}>
              ({seller.total_reviews ?? 0} reviews)
            </span>
          </div>
        </div>
      </section>

      <section className="px-4 pt-4">
        {isVerifiedAccess ? (
          <button
            type="button"
            onClick={() => void handleMessageInApp()}
            disabled={messaging}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1D9E75] py-3 text-sm font-medium text-[#092012] disabled:opacity-60"
          >
            <MessageSquare size={16} />
            {messaging ? "Starting conversation…" : "Message on Eden Harvest"}
          </button>
        ) : (
          <Link
            href="/upgrade"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-eden-gold/40 bg-eden-gold/10 py-3 text-sm font-medium text-eden-gold"
          >
            Upgrade to message sellers in-app
          </Link>
        )}
        {messageError ? <p className="mt-2 text-[11px] text-[#F09595]">{messageError}</p> : null}
        <p className="mt-2 text-[11px] text-white/45">
          Message this seller in Eden Harvest.
        </p>
      </section>

      <section className="px-4 pt-4">
        <div className="glass-card p-4">
          <h2 className={`eden-section-title ${theme === "dark" ? "text-white" : "text-[#1A1A18]"}`}>
            About this farm
          </h2>
          <p className={`mt-3 text-[11px] font-medium ${theme === "dark" ? "text-white/75" : "text-[#444441]"}`}>
            Location: {seller.state_region}
          </p>
        </div>
      </section>

      {listings.length > 0 ? (
        <section className="px-4 pt-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className={`eden-section-title ${theme === "dark" ? "text-white" : "text-[#1A1A18]"}`}>
              Available produce
            </h2>
            <span className={`text-xs ${theme === "dark" ? "text-white/55" : "text-[#444441]"}`}>
              {listings.length} listings
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {listings.map((item) => (
              <Link key={item.id} href={`/listing/${item.id}`} className="glass-card block p-3">
                <p className="text-sm font-semibold">{item.product_name}</p>
                <p className="mt-1 text-xs text-white/55">{item.category}</p>
                <p className="mt-2 text-sm font-bold text-eden-gold">
                  {item.price_currency_code} {Number(item.price_local).toLocaleString()}
                  <span className="text-xs font-normal text-white/50"> / {item.unit}</span>
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="px-4 pb-4 pt-4">
        <button
          type="button"
          onClick={() => setReportModalOpen(true)}
          className="inline-flex items-center gap-1 text-xs text-white/50 underline-offset-2 hover:underline"
        >
          <Flag size={12} />
          Report this seller
        </button>
      </section>

      {reportModalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
          <div className="glass-card w-full max-w-sm p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base font-semibold">Report this seller</h3>
              <button type="button" onClick={() => setReportModalOpen(false)}>
                <X size={16} className="text-white/65" />
              </button>
            </div>
            <textarea
              rows={4}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Describe the issue..."
              className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-eden-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                setReportReason("");
                setReportModalOpen(false);
              }}
              className="mt-3 w-full rounded-xl bg-eden-primary py-2.5 text-sm font-medium"
            >
              Submit report
            </button>
          </div>
        </div>
      ) : null}

      <MobileBottomNav active="browse" />
    </main>
  );
}
