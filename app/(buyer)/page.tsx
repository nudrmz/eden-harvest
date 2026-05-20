"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FarmLogoAvatar } from "@/components/ui/FarmLogoAvatar";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { useAuth } from "@/lib/supabase/hooks";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useTheme } from "@/components/layout/ThemeProvider";
import { ListingCard } from "@/components/ui/ListingCard";
import {
  buyerLocation,
  categoryChips,
  featuredSeller,
  homeStats,
  listings,
  topVerifiedSellers
} from "@/lib/mockData";

export default function BuyerHomePage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const showSignIn = !authLoading && !isAuthenticated;
  const showGreeting = !authLoading && isAuthenticated && Boolean(user?.full_name);
  const [activeCategory, setActiveCategory] = useState("All");

  const timeGreeting = (() => {
    const hour = new Date().getHours();
    if (hour <= 11) return "Good morning";
    if (hour <= 17) return "Good afternoon";
    return "Good evening";
  })();

  const greetingLine =
    showGreeting && user?.full_name
      ? `${timeGreeting}, ${user.full_name.split(" ")[0] ?? user.full_name}`
      : null;

  return (
    <main className="app-shell mx-auto min-h-screen w-full max-w-md overflow-x-hidden pb-24 no-scrollbar">
      <section className="hero-photo relative h-[340px] overflow-hidden rounded-b-[24px] border-b border-[var(--card-border)]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/hero-farmers.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/70" />

        <div className="relative flex h-full flex-col px-4 pb-6 pt-4">
          <div className="flex items-start gap-2">
            <FarmLogoAvatar size={72} variant="hero" priority className="mt-0.5" />

            {showGreeting && greetingLine ? (
              <div className="min-w-0 flex-1 pt-3 text-center">
                <p
                  className="font-heading text-sm font-semibold"
                  style={{
                    color: "#ffffff",
                    textShadow: "0 1px 4px rgba(0,0,0,0.5)"
                  }}
                >
                  {greetingLine}
                </p>
              </div>
            ) : (
              <div className="min-w-0 flex-1" aria-hidden />
            )}

            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <NotificationBell variant="hero" />
              </div>
              {showSignIn ? (
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="inline-block rounded-[20px] text-white"
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    border: "0.5px solid rgba(255,255,255,0.3)",
                    fontSize: "12px",
                    padding: "5px 12px"
                  }}
                >
                  Sign in
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-auto">
            <p
              className="eden-hero-eyebrow"
              style={{ color: "rgba(255,255,255,0.92)", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
            >
              Africa&apos;s finest, delivered worldwide
            </p>
            <h1
              className="eden-hero-headline mt-2"
              style={{ color: "#ffffff", textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}
            >
              Source fresh
              <br />
              African produce
            </h1>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div
                className={`rounded-xl backdrop-blur-sm ${theme === "dark" ? "glass-card" : "border border-white/50 bg-white/80"}`}
                style={{ padding: "6px 10px" }}
              >
                <p
                  className={`leading-none ${theme === "dark" ? "text-white/65" : "text-[#444441]"}`}
                  style={{ fontSize: "10px" }}
                >
                  Active sellers
                </p>
                <p
                  className={`leading-tight ${theme === "dark" ? "text-white" : "text-[#1A1A18]"}`}
                  style={{ fontSize: "16px", fontWeight: 600 }}
                >
                  {homeStats.activeSellers}
                </p>
              </div>
              <div
                className={`rounded-xl backdrop-blur-sm ${theme === "dark" ? "glass-card" : "border border-white/50 bg-white/80"}`}
                style={{ padding: "6px 10px" }}
              >
                <p
                  className={`leading-none ${theme === "dark" ? "text-white/65" : "text-[#444441]"}`}
                  style={{ fontSize: "10px" }}
                >
                  Products
                </p>
                <p
                  className={`leading-tight ${theme === "dark" ? "text-white" : "text-[#1A1A18]"}`}
                  style={{ fontSize: "16px", fontWeight: 600 }}
                >
                  {homeStats.products}
                </p>
              </div>
              <div
                className={`rounded-xl backdrop-blur-sm ${theme === "dark" ? "glass-card" : "border border-white/50 bg-white/80"}`}
                style={{ padding: "6px 10px" }}
              >
                <p
                  className={`leading-none ${theme === "dark" ? "text-white/65" : "text-[#444441]"}`}
                  style={{ fontSize: "10px" }}
                >
                  Your location
                </p>
                <p
                  className={`leading-tight ${theme === "dark" ? "text-white" : "text-[#1A1A18]"}`}
                  style={{ fontSize: "16px", fontWeight: 600 }}
                >
                  {buyerLocation.city}
                  <span className={`ml-1 ${theme === "dark" ? "text-white/65" : "text-[#444441]"}`} style={{ fontSize: "12px", fontWeight: 500 }}>
                    ({buyerLocation.currency})
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-10 -mt-5 px-4">
        <div className="glass-card themed-search flex items-center gap-2 rounded-[16px] px-3 py-2.5">
          <Search size={16} className="text-[var(--text-tertiary)]" />
          <input
            className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[#9C9C95] focus:outline-none"
            placeholder="Search crayfish, ogiri, palm oil..."
            readOnly
          />
          <button
            type="button"
            onClick={() => router.push("/browse?filters=open")}
            className="flex items-center gap-1 rounded-xl bg-eden-primary px-3 py-1.5 text-xs font-medium text-white"
          >
            <SlidersHorizontal size={14} />
            Filter
          </button>
        </div>
      </div>

      <section className="mt-4 px-4">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {categoryChips.map((chip) => {
            const isActive = activeCategory === chip;
            return (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  setActiveCategory(chip);
                  if (chip === "All") {
                    router.push("/browse");
                  } else {
                    router.push(`/browse?category=${encodeURIComponent(chip)}`);
                  }
                }}
                className={`eden-category-chip whitespace-nowrap rounded-full border px-3 py-1.5 transition ${
                  isActive
                    ? "border-eden-primary bg-eden-primary text-white"
                    : "border-[#F0EDE6] bg-[#F0EDE6] text-[#444441]"
                }`}
              >
                {chip}
              </button>
            );
          })}
        </div>
      </section>

      <section className="px-4 pt-4">
        <div className="relative h-[180px] overflow-hidden rounded-2xl border border-white/10">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1f3f2d] via-[#142c20] to-[#0b140c]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(245,196,66,0.25),transparent_40%)]" />
          <div className="relative flex h-full flex-col p-4">
            <span className="w-fit rounded-full bg-[#F5C4422A] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-eden-gold" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.45)" }}>
              {featuredSeller.tag}
            </span>
            <h2 className="mt-2 text-lg font-semibold" style={{ color: "#ffffff", textShadow: "0 2px 8px rgba(0,0,0,0.55)" }}>{featuredSeller.productName}</h2>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.9)", textShadow: "0 1px 4px rgba(0,0,0,0.45)" }}>
              {featuredSeller.farmName} - {featuredSeller.flag} {featuredSeller.country}
            </p>
            <div className="mt-2 flex items-end justify-between">
              <div>
                <p className="text-lg font-semibold text-eden-gold" style={{ textShadow: "0 1px 5px rgba(0,0,0,0.45)" }}>{featuredSeller.buyerPrice}</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.82)", textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>{featuredSeller.sellerPrice}</p>
                <div className="mt-2 flex gap-1">
                  {featuredSeller.seasonalMonths.map((month, idx) => (
                    <span
                      key={idx}
                      className={`h-1.5 w-4 rounded-full ${month ? "bg-eden-gold" : "bg-white/15"}`}
                    />
                  ))}
                </div>
              </div>
              <button className="rounded-xl border border-[#2faf7e99] bg-[#25D36622] px-3 py-2 text-xs font-medium text-[#6BE79E]" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.35)" }}>
                Upgrade to contact
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pt-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className={`eden-section-title ${theme === "dark" ? "text-white" : "text-[#1A1A18]"}`}>In stock now</h3>
          <button className={`text-xs ${theme === "dark" ? "text-white/70" : "text-[#444441]"}`}>See all</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>

      <section className="px-4 pt-5">
        <div className="glass-card p-3.5">
          <h3 className={`eden-section-title ${theme === "dark" ? "text-white" : "text-[#1A1A18]"}`}>Platform trust scores</h3>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className={`rounded-xl border p-2 text-center ${theme === "dark" ? "border-white/10 bg-[#0b160b]" : "border-[#1D9E75] bg-[#1D9E75]"}`}>
              <p className={`text-lg font-semibold ${theme === "dark" ? "text-eden-gold" : "text-white"}`}>4.8</p>
              <p className={`text-[10px] ${theme === "dark" ? "text-eden-gold" : "text-white"}`}>★★★★★</p>
              <p className={`text-[9px] ${theme === "dark" ? "text-white/55" : "text-white/90"}`}>Avg seller score</p>
            </div>
            <div className={`rounded-xl border p-2 text-center ${theme === "dark" ? "border-white/10 bg-[#0b160b]" : "border-[#1D9E75] bg-[#1D9E75]"}`}>
              <p className={`text-lg font-semibold ${theme === "dark" ? "text-eden-gold" : "text-white"}`}>4.6</p>
              <p className={`text-[10px] ${theme === "dark" ? "text-eden-gold" : "text-white"}`}>★★★★☆</p>
              <p className={`text-[9px] ${theme === "dark" ? "text-white/55" : "text-white/90"}`}>Avg buyer score</p>
            </div>
            <div className={`rounded-xl border p-2 text-center ${theme === "dark" ? "border-white/10 bg-[#0b160b]" : "border-[#1D9E75] bg-[#1D9E75]"}`}>
              <p className={`text-lg font-semibold ${theme === "dark" ? "text-[#5DCAA5]" : "text-white"}`}>96%</p>
              <p className={`text-[10px] ${theme === "dark" ? "text-white/60" : "text-white"}`}>Completed</p>
              <p className={`text-[9px] ${theme === "dark" ? "text-white/55" : "text-white/90"}`}>Deals completed</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-6 pt-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className={`eden-section-title ${theme === "dark" ? "text-white" : "text-[#1A1A18]"}`}>Top verified sellers</h3>
          <button className={`text-xs ${theme === "dark" ? "text-white/70" : "text-[#444441]"}`}>View map</button>
        </div>
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
          {topVerifiedSellers.map((seller) => (
            <article
              key={seller.id}
              className={`min-w-[170px] rounded-2xl p-3 ${theme === "dark" ? "glass-card" : "border border-[rgba(0,0,0,0.08)] bg-white shadow-sm"}`}
            >
              <div className="flex items-center gap-2">
                <div
                  className="relative flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold"
                  style={{ borderColor: seller.borderColor }}
                >
                  {seller.initials}
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#5DCAA5]" />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${theme === "dark" ? "text-white" : "text-[#1A1A18]"}`}>{seller.farmName}</p>
                  <p className={`text-[10px] ${theme === "dark" ? "text-white/60" : "text-[#6B6B66]"}`}>{seller.countryState}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-eden-gold">★ {seller.rating.toFixed(1)}</p>
            </article>
          ))}
        </div>
      </section>

      <MobileBottomNav active="home" />
    </main>
  );
}
