"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, BadgeCheck, Store } from "lucide-react";
import { useAuth } from "@/lib/supabase/hooks";

type Rel<T> = T | T[] | null;

interface SellerRow {
  id: string;
  farm_name: string;
  state_region: string;
  is_verified: boolean;
  created_at: string;
  african_countries: Rel<{ name: string; flag_emoji: string }>;
  users: Rel<{ email: string; role: string; membership_tier: string }>;
  listingCount: number;
  activeListingCount: number;
  enquiryCount: number;
}

function one<T>(v: Rel<T> | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

export default function AdminSellersPage() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const [sellers, setSellers] = useState<SellerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [retiring, setRetiring] = useState<SellerRow | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/sellers");
      const body = (await res.json()) as { sellers?: SellerRow[]; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Could not load sellers.");
      setSellers(body.sellers ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load sellers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    void load();
  }, [authLoading, isAuthenticated, load]);

  const retire = async () => {
    if (!retiring || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/sellers/${retiring.id}/retire`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmFarmName: confirmText })
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(body?.error ?? "Could not retire this seller.");
      setNotice(`${retiring.farm_name} has been retired. The account is now a buyer.`);
      setRetiring(null);
      setConfirmText("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not retire this seller.");
    } finally {
      setBusy(false);
    }
  };

  if (authLoading || loading) {
    return (
      <main className="app-shell mx-auto min-h-screen w-full max-w-md px-4 py-8">
        <p className="text-sm text-[var(--text-secondary)]">Loading sellers…</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="app-shell mx-auto min-h-screen w-full max-w-md px-4 py-8">
        <p className="text-sm text-[var(--text-secondary)]">Sign in with an admin account.</p>
        <Link
          href="/login?redirect=/admin/sellers"
          className="mt-4 inline-flex rounded-xl bg-[#1D9E75] px-4 py-2.5 text-sm font-semibold text-[#ffffff]"
        >
          Sign in
        </Link>
      </main>
    );
  }

  const matches =
    retiring && confirmText.trim().toLowerCase() === retiring.farm_name.trim().toLowerCase();

  return (
    <main className="app-shell mx-auto min-h-screen w-full max-w-md px-4 pb-10 pt-6">
      <div className="flex items-center gap-3">
        <Link href="/profile" aria-label="Back" className="text-[var(--text-tertiary)]">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="font-heading text-xl font-semibold text-[var(--text-primary)]">Sellers</h1>
          <p className="text-xs text-[var(--text-tertiary)]">Every farm on Eden Harvest</p>
        </div>
      </div>

      {notice ? (
        <p className="mt-4 rounded-xl border border-[#1D9E7555] bg-[#1D9E7518] px-3 py-2.5 text-sm text-[var(--text-primary)]">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-xl border border-[#E5484D55] bg-[#E5484D18] px-3 py-2.5 text-sm text-[#E5484D]">
          {error}
        </p>
      ) : null}

      <ul className="mt-6 space-y-3">
        {sellers.map((s) => {
          const country = one(s.african_countries);
          const owner = one(s.users);
          return (
            <li key={s.id} className="glass-card rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)]">
                    <Store size={14} className="shrink-0 text-[#1D9E75]" />
                    <Link href={`/seller/${s.id}`} className="truncate hover:underline">
                      {s.farm_name}
                    </Link>
                    {s.is_verified ? <BadgeCheck size={14} className="shrink-0 text-[#1D9E75]" /> : null}
                  </p>
                  <p className="mt-0.5 text-[length:calc(11px*var(--fs-small))] text-[var(--text-secondary)]">
                    {s.state_region}
                    {country ? `, ${country.name}` : ""}
                  </p>
                  <p className="mt-0.5 truncate text-[length:calc(11px*var(--fs-small))] text-[var(--text-tertiary)]">
                    {owner?.email ?? "No account"}
                    {owner ? ` · account: ${owner.role}` : ""}
                    {owner?.membership_tier === "verified_access" ? " · Verified Access" : ""}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-[length:calc(11px*var(--fs-small))] text-[var(--text-tertiary)]">
                {s.activeListingCount} live / {s.listingCount} listings · {s.enquiryCount} enquiries
              </p>
              <button
                type="button"
                onClick={() => {
                  setRetiring(s);
                  setConfirmText("");
                  setNotice(null);
                  setError(null);
                }}
                className="mt-3 rounded-lg border border-[#E5484D55] px-3 py-1.5 text-xs font-semibold text-[#E5484D] hover:bg-[#E5484D18]"
              >
                Retire seller profile
              </button>
            </li>
          );
        })}
      </ul>

      {retiring ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="retire-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-[var(--card-border)] bg-[var(--app-bg)] p-5">
            <h2 id="retire-title" className="text-base font-semibold text-[var(--text-primary)]">
              Retire {retiring.farm_name}?
            </h2>
            <ul className="mt-3 space-y-1.5 text-xs text-[var(--text-secondary)]">
              <li>
                • Permanently deletes the farm profile, its{" "}
                <strong className="text-[var(--text-primary)]">{retiring.listingCount} listing(s)</strong>{" "}
                and <strong className="text-[var(--text-primary)]">{retiring.enquiryCount} enquiry record(s)</strong>.
              </li>
              <li>• Switches {one(retiring.users)?.email ?? "the account"} back to a buyer.</li>
              <li>
                • Keeps their sign-in, Verified Access subscription, reviews and chat history.
              </li>
            </ul>
            <label className="mt-4 block text-xs text-[var(--text-secondary)]">
              Type <strong className="text-[var(--text-primary)]">{retiring.farm_name}</strong> to confirm
            </label>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoFocus
              className="eden-field-input mt-1.5"
              placeholder={retiring.farm_name}
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setRetiring(null)}
                className="flex-1 rounded-xl border border-[var(--card-border)] py-2.5 text-sm font-semibold text-[var(--text-primary)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void retire()}
                disabled={!matches || busy}
                className="flex-1 rounded-xl bg-[#E5484D] py-2.5 text-sm font-semibold text-[#ffffff] disabled:opacity-40"
              >
                {busy ? "Retiring…" : "Retire"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
