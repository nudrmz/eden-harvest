"use client";

import Link from "next/link";
import { Bell, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useTheme } from "@/components/layout/ThemeProvider";
import { SELLER_PROFILE_STORAGE_KEY } from "@/lib/utils/constants";
import { useAuth } from "@/lib/supabase/hooks";

interface StoredSellerProfile {
  farmName?: string;
  flag?: string;
}

const MOCK_FALLBACK = {
  farmName: "Sunrise Roots Co-op",
  flag: "🇰🇪"
};

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
  const [profile, setProfile] = useState(MOCK_FALLBACK);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SELLER_PROFILE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredSellerProfile;
      if (parsed.farmName) {
        setProfile({
          farmName: parsed.farmName,
          flag: parsed.flag ?? "🌾"
        });
      }
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <main className="eden-seller-shell app-shell font-body mx-auto min-h-screen w-full max-w-md pb-28 antialiased">
      <header className="sticky top-0 z-10 border-b border-[var(--card-border)] bg-[var(--glass-bg)] px-4 pb-4 pt-5 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={`text-xs ${textSecondary}`}>Seller hub</p>
            <h1 className={`font-heading mt-2 text-2xl font-bold leading-snug ${textPrimary}`}>
              Welcome,{" "}
              {authLoading
                ? "…"
                : user?.full_name?.split(" ")[0] ?? profile.farmName}{" "}
              {profile.flag}
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
                Pending verification
              </p>
            </div>
            <span className="rounded-full bg-[rgba(250,199,117,0.18)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#FAC775]">
              Pending
            </span>
          </div>
          <p className={`mt-3 text-xs leading-relaxed ${textSecondary}`}>
            Our team reviews new farms within 48 hours. You can still prepare listings meanwhile.
          </p>
        </section>

        <section className="grid grid-cols-3 gap-2">
          <div className={`${glass} p-2.5 text-center`}>
            <p className={`text-[10px] ${textSecondary}`}>Listings</p>
            <p className={`mt-1 text-sm font-semibold ${textPrimary}`}>0</p>
          </div>
          <div className={`${glass} p-2.5 text-center`}>
            <p className={`text-[10px] ${textSecondary}`}>Enquiries</p>
            <p className={`mt-1 text-sm font-semibold ${textPrimary}`}>0</p>
          </div>
          <div className={`${glass} p-2.5 text-center`}>
            <p className="text-[10px] text-[rgba(255,255,255,0.65)]">Rating</p>
            <p className="mt-1 text-sm font-semibold text-[#9FE1CB]">New</p>
          </div>
        </section>

        <Link
          href="/seller/listings/new"
          className={`${glass} flex min-h-[168px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#1D9E75]/55 p-6 text-center transition hover:border-[#1D9E75] hover:bg-[rgba(12,26,14,0.55)]`}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(29,158,117,0.2)] text-[#1D9E75]">
            <Plus size={28} strokeWidth={2.25} />
          </div>
          <p className={`eden-section-title ${textPrimary}`}>Add your first listing</p>
          <p className={`text-xs ${textTertiary}`}>
            Photos, pricing in local currency, stock status
          </p>
        </Link>

        <section className={`${glass} p-4`}>
          <h2 className={`eden-section-title ${textPrimary}`}>Recent enquiries</h2>
          <p className={`mt-4 text-center text-sm ${textSecondary}`}>
            No enquiries yet. Once buyers contact you, they&apos;ll appear here.
          </p>
        </section>

        <section className={`${glass} p-4`}>
          <h2 className={`eden-section-title ${textPrimary}`}>Sale stories</h2>
          <p className={`mt-1 text-xs ${textTertiary}`}>
            Share what&apos;s happening on your farm
          </p>
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
