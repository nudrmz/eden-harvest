"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useAuth } from "@/lib/supabase/hooks";
import { stripeConfig, type VerifiedAccessPlan } from "@/lib/stripe/config";

const BENEFITS = [
  "Message any seller directly, in-app or on WhatsApp",
  "See every seller's reviews and ratings",
  "Unlimited enquiries across all listings"
];

function yearlySavingsPercent(): number {
  const monthlyAnnualised = stripeConfig.verifiedAccessMonthlyPriceGbp * 12;
  const savings = 1 - stripeConfig.verifiedAccessYearlyPriceGbp / monthlyAnnualised;
  return Math.round(savings * 100);
}

function UpgradePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, isVerifiedAccess, refreshProfile } = useAuth();

  const [plan, setPlan] = useState<VerifiedAccessPlan>("yearly");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkoutStatus = searchParams.get("checkout");
  const pollAttempts = useRef(0);

  // Right after a successful checkout the webhook may still be a second or
  // two behind — poll a few times rather than making the buyer refresh by hand.
  useEffect(() => {
    if (checkoutStatus !== "success" || isVerifiedAccess) return;

    const interval = window.setInterval(() => {
      pollAttempts.current += 1;
      void refreshProfile();
      if (pollAttempts.current >= 6) {
        window.clearInterval(interval);
      }
    }, 1500);

    return () => window.clearInterval(interval);
  }, [checkoutStatus, isVerifiedAccess, refreshProfile]);

  async function handleContinue() {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan })
      });

      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        setError(payload.error ?? "Could not start checkout.");
        setSubmitting(false);
        return;
      }

      window.location.href = payload.url;
    } catch {
      setError("Could not start checkout. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  const savings = yearlySavingsPercent();

  return (
    <main className="app-shell mx-auto min-h-screen w-full max-w-md pb-28">
      <header className="sticky top-0 z-10 border-b border-[var(--card-border)] bg-[var(--glass-bg)] px-4 pb-4 pt-5 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <h1 className="eden-section-title text-[var(--text-primary)]">Verified Access</h1>
          <ThemeToggle />
        </div>
      </header>

      <div className="px-4 pt-6">
        {loading ? (
          <p className="text-center text-sm text-[var(--text-secondary)]">Loading…</p>
        ) : !user ? (
          <div className="glass-card p-5 text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              Sign in to upgrade to Verified Access.
            </p>
          </div>
        ) : isVerifiedAccess ? (
          <div className="glass-card p-5 text-center">
            <ShieldCheck size={32} className="mx-auto text-eden-gold" />
            <h2 className="mt-3 font-heading text-lg font-semibold text-[var(--text-primary)]">
              You're on Verified Access
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Message sellers and see reviews across Eden Harvest.
            </p>
            <button
              type="button"
              onClick={() => router.push("/profile")}
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[#1D9E75] py-3 text-sm font-semibold text-[#092012]"
            >
              Back to profile
            </button>
          </div>
        ) : (
          <>
            {checkoutStatus === "canceled" ? (
              <p className="mb-4 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-center text-xs text-[var(--text-secondary)]">
                Checkout was canceled — no charge was made.
              </p>
            ) : null}
            {checkoutStatus === "success" ? (
              <p className="mb-4 rounded-xl border border-eden-gold/40 bg-eden-gold/10 px-4 py-3 text-center text-xs text-eden-gold">
                Payment received — activating Verified Access…
              </p>
            ) : null}

            <section className="glass-card p-5">
              <h2 className="font-heading text-lg font-semibold text-[var(--text-primary)]">
                Unlock Verified Access
              </h2>
              <ul className="mt-3 space-y-2">
                {BENEFITS.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                    <Check size={16} className="mt-0.5 shrink-0 text-eden-primary" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPlan("monthly")}
                className={`rounded-xl border p-4 text-left transition ${
                  plan === "monthly"
                    ? "border-eden-primary bg-eden-primary/10"
                    : "border-[var(--card-border)]"
                }`}
              >
                <p className="text-xs text-[var(--text-tertiary)]">Monthly</p>
                <p className="mt-1 font-heading text-xl font-bold text-[var(--text-primary)]">
                  £{stripeConfig.verifiedAccessMonthlyPriceGbp}
                  <span className="text-xs font-normal text-[var(--text-tertiary)]">/mo</span>
                </p>
              </button>
              <button
                type="button"
                onClick={() => setPlan("yearly")}
                className={`relative rounded-xl border p-4 text-left transition ${
                  plan === "yearly"
                    ? "border-eden-gold bg-eden-gold/10"
                    : "border-[var(--card-border)]"
                }`}
              >
                <span className="absolute -top-2 right-3 rounded-full bg-eden-gold px-2 py-0.5 text-[10px] font-semibold text-[#2a1f00]">
                  Save {savings}%
                </span>
                <p className="text-xs text-[var(--text-tertiary)]">Yearly</p>
                <p className="mt-1 font-heading text-xl font-bold text-[var(--text-primary)]">
                  £{stripeConfig.verifiedAccessYearlyPriceGbp}
                  <span className="text-xs font-normal text-[var(--text-tertiary)]">/yr</span>
                </p>
              </button>
            </section>

            {error ? (
              <p className="mt-3 text-center text-[11px] text-[#F09595]">{error}</p>
            ) : null}

            <button
              type="button"
              onClick={() => void handleContinue()}
              disabled={submitting}
              className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[#1D9E75] py-3.5 text-sm font-semibold text-[#092012] disabled:opacity-60"
            >
              {submitting ? "Redirecting to payment…" : "Continue to payment"}
            </button>
            <p className="mt-2 text-center text-[11px] text-[var(--text-tertiary)]">
              Cancel anytime from Stripe's billing portal link in your receipt email.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

export default function UpgradePage() {
  return (
    <Suspense
      fallback={
        <main className="app-shell mx-auto min-h-screen w-full max-w-md pb-28 px-4 pt-6">
          <p className="text-center text-sm text-[var(--text-secondary)]">Loading…</p>
        </main>
      }
    >
      <UpgradePageContent />
    </Suspense>
  );
}
