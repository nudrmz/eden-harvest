"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Flag, MessageCircle, Share2, Star, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { useTheme } from "@/components/layout/ThemeProvider";
import { ListingCard } from "@/components/ui/ListingCard";
import {
  listings,
  sellerProfileMock,
  sellerReviewsMock
} from "@/lib/mockData";

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
  const [verifiedBuyerView, setVerifiedBuyerView] = useState(false);
  const [hasEnquiry] = useState(true);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");

  const sellerId = params?.id ?? "seller-1";
  const seller = sellerId === "seller-1" ? sellerProfileMock : sellerProfileMock;
  const sellerListings = useMemo(
    () => listings.filter((item) => item.sellerId === "seller-1").slice(0, 4),
    []
  );

  const seasonalRows = [
    { name: "Ogiri", months: [1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1] },
    { name: "Locust bean", months: [1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1] },
    { name: "Palm oil", months: [1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1] },
    { name: "Ofada rice", months: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0] }
  ];

  return (
    <main className="app-shell mx-auto min-h-screen w-full max-w-md pb-24">
      <section className="relative h-[250px] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/hero-farmers.png')" }}
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
          <h1 className={`font-heading text-[20px] font-bold ${theme === "dark" ? "text-white" : "text-[#1A1A18]"}`}>{seller.farmName}</h1>
          <p className="mt-1 text-xs text-white/65">
            {seller.flag} {seller.country}, {seller.state}
          </p>
          <div className="mt-3 flex items-center gap-2">
            {seller.isVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-eden-gold/35 bg-eden-gold/15 px-2.5 py-1 text-[10px] font-semibold text-eden-gold">
                <CheckCircle2 size={12} />
                Verified seller
              </span>
            ) : (
              <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] text-white/65">
                Unverified
              </span>
            )}
          </div>
          <p className="mt-2 text-[10px] text-white/45">Member since March 2025</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-2xl font-semibold">{seller.rating.toFixed(1)}</span>
            <div className="flex items-center gap-0.5">{renderStars(seller.rating)}</div>
            <span className="text-xs text-white/60">({seller.totalReviews} reviews)</span>
          </div>
        </div>
      </section>

      <section className="px-4 pt-4">
        {!verifiedBuyerView ? (
          <div className="glass-card p-4">
            <p className="text-sm text-white/75">Upgrade to Verified Access to contact sellers</p>
            <button className="mt-3 w-full rounded-xl bg-eden-primary py-3 text-sm font-medium">
              Upgrade - £7/month
            </button>
          </div>
        ) : (
          <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-medium text-[#092012]">
            <MessageCircle size={16} />
            Contact on WhatsApp
          </button>
        )}
        <button
          type="button"
          onClick={() => setVerifiedBuyerView((prev) => !prev)}
          className="mt-2 text-xs text-white/55 underline-offset-2 hover:underline"
        >
          Toggle buyer tier preview
        </button>
        <p className="mt-2 text-[11px] text-white/45">
          Deals happen directly between you and the seller via WhatsApp
        </p>
      </section>

      <section className="px-4 pt-4">
        <div className="glass-card p-4">
          <h2 className={`font-heading text-base font-semibold ${theme === "dark" ? "text-white" : "text-[#1A1A18]"}`}>About this farm</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/72">{seller.description}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <p className="text-white/75">Location: {seller.state}, {seller.country}</p>
            <p className="text-white/75">Established: {seller.established}</p>
            <p className="text-white/75">Speciality: {seller.speciality}</p>
            <p className="text-white/75">Min orders: {seller.minOrders}</p>
          </div>
        </div>
      </section>

      <section className="px-4 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className={`font-heading text-base font-semibold ${theme === "dark" ? "text-white" : "text-[#1A1A18]"}`}>Available produce</h2>
          <span className="text-xs text-white/55">{sellerListings.length} listings</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {sellerListings.map((item) => (
            <ListingCard key={item.id} listing={item} showSeasonBar />
          ))}
        </div>
      </section>

      <section className="px-4 pt-4">
        <div className="glass-card p-4">
          <h2 className={`font-heading text-base font-semibold ${theme === "dark" ? "text-white" : "text-[#1A1A18]"}`}>Seasonal availability</h2>
          <div className="mt-3 overflow-x-auto no-scrollbar">
            <div className="min-w-[310px]">
              <div className="grid grid-cols-[95px_repeat(12,1fr)] gap-1 text-[10px] text-white/45">
                <span />
                {["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"].map((m) => (
                  <span key={m} className="text-center">{m}</span>
                ))}
              </div>
              {seasonalRows.map((row) => (
                <div key={row.name} className="mt-1 grid grid-cols-[95px_repeat(12,1fr)] gap-1">
                  <span className="text-[10px] text-white/70">{row.name}</span>
                  {row.months.map((month, idx) => (
                    <span
                      key={`${row.name}-${idx}`}
                      className={`h-4 rounded-sm ${month ? "bg-eden-gold/90" : "bg-white/10"}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pt-4">
        <div className="glass-card relative p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className={`font-heading text-base font-semibold ${theme === "dark" ? "text-white" : "text-[#1A1A18]"}`}>Buyer reviews</h2>
            <span className="text-xs text-white/55">{seller.totalReviews} reviews</span>
          </div>
          <div className={`${!verifiedBuyerView ? "blur-[3px]" : ""} space-y-2 transition`}>
            {sellerReviewsMock.map((review) => (
              <article key={review.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold">
                      {review.buyerName} {review.buyerFlag} {review.buyerCountry}
                    </p>
                    <div className="mt-1 flex items-center gap-0.5">{renderStars(review.rating)}</div>
                  </div>
                  <span className="text-[10px] text-white/45">{review.dateLabel}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-white/75">{review.comment}</p>
                {review.confirmedPurchase ? (
                  <span className="mt-2 inline-block rounded-full bg-[#5DCAA533] px-2 py-0.5 text-[10px] text-[#5DCAA5]">
                    Confirmed purchase
                  </span>
                ) : null}
              </article>
            ))}
          </div>

          {!verifiedBuyerView ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-[#0f1f0fcc] px-5 text-center">
              <p className="text-sm text-white/85">Upgrade to Verified Access to read reviews</p>
              <button className="mt-3 rounded-xl bg-eden-primary px-4 py-2 text-xs font-medium">
                Upgrade - £7/month
              </button>
            </div>
          ) : null}
        </div>
        {verifiedBuyerView && hasEnquiry ? (
          <button className="mt-3 w-full rounded-xl border border-white/15 bg-white/5 py-2.5 text-sm font-medium">
            Write a review
          </button>
        ) : null}
      </section>

      <section className="px-4 pt-4">
        <div className="glass-card p-4">
          <h2 className="font-heading text-sm font-semibold">This seller rates their buyers</h2>
          <p className="mt-2 text-xs text-white/65">
            Sellers can rate buyers too. Maintain a good reputation by being reliable and respectful.
          </p>
          <p className="mt-2 text-sm text-eden-gold">Your buyer rating: 4.7 ★</p>
        </div>
      </section>

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
              onChange={(event) => setReportReason(event.target.value)}
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

      <MobileBottomNav active="home" />
    </main>
  );
}
