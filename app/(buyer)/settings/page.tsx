"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Bell, HelpCircle, Shield, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { DarkSelect } from "@/components/ui/DarkSelect";
import { useAuth } from "@/lib/supabase/hooks";
import { createClient } from "@/lib/supabase/client";
import { currencyForBuyerCountry } from "@/lib/auth/profile";
import { BUYER_COUNTRY_OPTIONS } from "@/lib/utils/constants";

const NOTIFICATION_PREFS_KEY = "eden_harvest_notification_prefs";

interface NotificationPrefs {
  enquiries: boolean;
  listingUpdates: boolean;
  marketing: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  enquiries: true,
  listingUpdates: true,
  marketing: false
};

function readNotificationPrefs(): NotificationPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(NOTIFICATION_PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as NotificationPrefs) };
  } catch {
    return DEFAULT_PREFS;
  }
}

function ToggleRow({
  label,
  description,
  checked,
  onChange
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/10 py-3.5 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-[#1D9E75]" : "bg-white/20"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading, refreshProfile, isSeller } = useAuth();

  const [fullName, setFullName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [prefsSaved, setPrefsSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFullName(user.full_name ?? "");
    setCountryCode(user.country_code ?? "");
  }, [user]);

  useEffect(() => {
    setPrefs(readNotificationPrefs());
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?redirect=/settings&message=Sign%20in%20to%20edit%20your%20profile");
    }
  }, [loading, user, router]);

  async function handleSaveProfile(event: FormEvent) {
    event.preventDefault();
    if (!user || saving) return;

    const trimmed = fullName.trim();
    if (!trimmed) {
      setSaveError("Please enter your name.");
      setSaveSuccess(null);
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    const supabase = createClient();
    const updates: {
      full_name: string;
      country_code?: string | null;
      detected_currency?: string | null;
    } = {
      full_name: trimmed
    };

    if (user.role === "buyer") {
      updates.country_code = countryCode || null;
      updates.detected_currency = countryCode ? currencyForBuyerCountry(countryCode) : null;
    }

    const { error } = await supabase.from("users").update(updates).eq("id", user.id);

    setSaving(false);

    if (error) {
      setSaveError(error.message);
      return;
    }

    await refreshProfile();
    setSaveSuccess("Profile updated.");
  }

  function updatePref(key: keyof NotificationPrefs, value: boolean) {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      setPrefsSaved(true);
      window.setTimeout(() => setPrefsSaved(false), 1500);
      return next;
    });
  }

  const countryOptions = BUYER_COUNTRY_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label
  }));

  const detectedCurrency =
    user?.role === "buyer" && countryCode
      ? currencyForBuyerCountry(countryCode)
      : user?.detected_currency ?? "—";

  return (
    <main className="app-shell mx-auto min-h-screen w-full max-w-md px-4 pb-28 pt-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/profile"
            className="glass-card flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-primary)]"
            aria-label="Back to profile"
          >
            <ArrowLeft size={16} />
          </Link>
          <h1 className="font-heading text-xl font-semibold text-[var(--text-primary)]">Settings</h1>
        </div>
        <ThemeToggle />
      </div>

      {loading ? (
        <p className="mt-10 text-sm text-[var(--text-secondary)]">Loading settings…</p>
      ) : !user ? (
        <p className="mt-10 text-sm text-[var(--text-secondary)]">Redirecting to sign in…</p>
      ) : (
        <div className="mt-6 space-y-6">
          <section id="profile" className="scroll-mt-24">
            <div className="mb-2 flex items-center gap-2 px-1">
              <UserRound size={14} className="text-[#1D9E75]" />
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Edit profile
              </p>
            </div>
            <form onSubmit={(e) => void handleSaveProfile(e)} className="glass-card space-y-4 p-4">
              <div>
                <label htmlFor="fullName" className="mb-1.5 block text-[11px] text-[var(--text-secondary)]">
                  Full name
                </label>
                <input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  className="eden-field-input w-full rounded-xl border border-[var(--card-border)] bg-[color:var(--search-bg)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[#1D9E75] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-1.5 block text-[11px] text-[var(--text-secondary)]">
                  Email
                </label>
                <input
                  id="email"
                  value={user.email}
                  readOnly
                  className="eden-field-input w-full rounded-xl border border-[var(--card-border)] bg-[color:var(--search-bg)] px-3 py-2.5 text-sm text-[var(--text-tertiary)] opacity-80"
                />
                <p className="mt-1 text-[10px] text-[var(--text-tertiary)]">
                  Email is managed by your sign-in account.
                </p>
              </div>

              <div>
                <p className="mb-1.5 text-[11px] text-[var(--text-secondary)]">Account type</p>
                <p className="rounded-xl border border-[var(--card-border)] bg-[color:var(--search-bg)] px-3 py-2.5 text-sm capitalize text-[var(--text-primary)]">
                  {user.role}
                  {isSeller ? " · Seller hub on dashboard" : ""}
                </p>
              </div>

              {user.role === "buyer" ? (
                <>
                  <div>
                    <label className="mb-1.5 block text-[11px] text-[var(--text-secondary)]">
                      Your country
                    </label>
                    <DarkSelect
                      value={countryCode}
                      options={countryOptions}
                      onChange={setCountryCode}
                      placeholder="Select country"
                    />
                  </div>
                  <div>
                    <p className="mb-1.5 text-[11px] text-[var(--text-secondary)]">Display currency</p>
                    <p className="rounded-xl border border-[var(--card-border)] bg-[color:var(--search-bg)] px-3 py-2.5 text-sm text-[var(--text-primary)]">
                      {detectedCurrency}
                    </p>
                    <p className="mt-1 text-[10px] text-[var(--text-tertiary)]">
                      Updates automatically when you change country.
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-[11px] leading-relaxed text-[var(--text-tertiary)]">
                  Farm details are managed in{" "}
                  <Link href="/dashboard" className="font-semibold text-[#1D9E75] hover:underline">
                    Seller hub
                  </Link>{" "}
                  and{" "}
                  <Link href="/onboarding" className="font-semibold text-[#1D9E75] hover:underline">
                    onboarding
                  </Link>
                  .
                </p>
              )}

              {saveError ? (
                <p className="rounded-xl border border-[#F0959540] bg-[#F0959518] px-3 py-2 text-sm text-[#F09595]">
                  {saveError}
                </p>
              ) : null}
              {saveSuccess ? (
                <p className="rounded-xl border border-[#1D9E7540] bg-[#1D9E7518] px-3 py-2 text-sm text-[#5DCAA5]">
                  {saveSuccess}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-[#1D9E75] py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(29,158,117,0.35)] disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </form>
          </section>

          <section id="notifications" className="scroll-mt-24">
            <div className="mb-2 flex items-center gap-2 px-1">
              <Bell size={14} className="text-[#1D9E75]" />
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Notifications
              </p>
            </div>
            <div className="glass-card px-4">
              <ToggleRow
                label="Enquiry alerts"
                description="When a buyer contacts you or you get a reply"
                checked={prefs.enquiries}
                onChange={(value) => updatePref("enquiries", value)}
              />
              <ToggleRow
                label="Listing updates"
                description="Stock, price, and listing status reminders"
                checked={prefs.listingUpdates}
                onChange={(value) => updatePref("listingUpdates", value)}
              />
              <ToggleRow
                label="Tips & offers"
                description="Occasional product tips from Eden Harvest"
                checked={prefs.marketing}
                onChange={(value) => updatePref("marketing", value)}
              />
            </div>
            {prefsSaved ? (
              <p className="mt-2 px-1 text-[11px] text-[#5DCAA5]">Preferences saved on this device.</p>
            ) : null}
          </section>

          <section id="support" className="scroll-mt-24">
            <div className="mb-2 flex items-center gap-2 px-1">
              <HelpCircle size={14} className="text-[#1D9E75]" />
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Support
              </p>
            </div>
            <div className="glass-card space-y-3 p-4 text-sm text-[var(--text-secondary)]">
              <div>
                <p className="font-medium text-[var(--text-primary)]">Help & FAQ</p>
                <p className="mt-1 text-[12px] leading-relaxed">
                  Buyers browse produce, contact sellers on WhatsApp, and complete deals directly.
                  Sellers publish listings from the Seller hub after onboarding.
                </p>
              </div>
              <div className="border-t border-white/10 pt-3">
                <p className="font-medium text-[var(--text-primary)]">Contact us</p>
                <a
                  href="mailto:hello@edenharvest.app"
                  className="mt-1 inline-block text-[12px] font-semibold text-[#1D9E75] hover:underline"
                >
                  hello@edenharvest.app
                </a>
              </div>
            </div>
          </section>

          <section id="legal" className="scroll-mt-24">
            <div className="mb-2 flex items-center gap-2 px-1">
              <Shield size={14} className="text-[#1D9E75]" />
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Legal
              </p>
            </div>
            <div className="glass-card space-y-3 p-4 text-[12px] leading-relaxed text-[var(--text-secondary)]">
              <div>
                <p className="font-medium text-[var(--text-primary)]">Privacy Policy</p>
                <p className="mt-1">
                  We store your account details, listings, and enquiries to run the marketplace. WhatsApp
                  numbers are only shared when a signed-in buyer contacts a seller.
                </p>
              </div>
              <div className="border-t border-white/10 pt-3">
                <p className="font-medium text-[var(--text-primary)]">Terms of Service</p>
                <p className="mt-1">
                  Eden Harvest connects buyers and sellers. Trades happen between you and the other party
                  via WhatsApp. Always verify quality and payment terms before completing a deal.
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      <MobileBottomNav active="profile" />
    </main>
  );
}
