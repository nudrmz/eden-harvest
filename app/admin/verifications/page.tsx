"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, BadgeCheck, ShieldX } from "lucide-react";
import { useAuth } from "@/lib/supabase/hooks";

interface PendingSeller {
  id: string;
  farm_name: string;
  state_region: string;
  local_area: string | null;
  whatsapp_number: string;
  verification_document_type: string;
  verification_document_value: string;
  verification_status?: string;
  is_verified: boolean;
  created_at: string;
  african_countries:
    | { name: string; flag_emoji: string }
    | { name: string; flag_emoji: string }[]
    | null;
  users:
    | { email: string; full_name: string | null }
    | { email: string; full_name: string | null }[]
    | null;
}

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default function AdminVerificationsPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [sellers, setSellers] = useState<PendingSeller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/verifications");
      const payload = (await response.json()) as {
        sellers?: PendingSeller[];
        error?: string;
        migrationRequired?: boolean;
      };

      if (!response.ok) {
        setError(payload.error ?? "Could not load verification queue.");
        setSellers([]);
        return;
      }

      setSellers(payload.sellers ?? []);
      setMigrationRequired(Boolean(payload.migrationRequired));
    } catch {
      setError("Could not load verification queue.");
      setSellers([]);
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
    void loadQueue();
  }, [authLoading, isAuthenticated, loadQueue]);

  async function approve(id: string) {
    setActingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/verifications/${id}/approve`, {
        method: "POST"
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Approve failed.");
        return;
      }
      setSellers((prev) => prev.filter((seller) => seller.id !== id));
    } catch {
      setError("Approve failed.");
    } finally {
      setActingId(null);
    }
  }

  async function reject(id: string, farmName: string) {
    const note = window.prompt(`Optional note for rejecting ${farmName}:`) ?? "";
    setActingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/verifications/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() || undefined })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Reject failed.");
        return;
      }
      setSellers((prev) => prev.filter((seller) => seller.id !== id));
    } catch {
      setError("Reject failed.");
    } finally {
      setActingId(null);
    }
  }

  if (authLoading || loading) {
    return (
      <main className="app-shell mx-auto min-h-screen w-full max-w-md px-4 py-8">
        <p className="text-sm text-[var(--text-secondary)]">Loading verification queue…</p>
      </main>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <main className="app-shell mx-auto min-h-screen w-full max-w-md px-4 py-8">
        <p className="text-sm text-[var(--text-secondary)]">Sign in with an admin account.</p>
        <Link
          href="/login?redirect=/admin/verifications"
          className="mt-4 inline-flex rounded-xl bg-[#1D9E75] px-4 py-2.5 text-sm font-semibold text-white"
        >
          Log in
        </Link>
      </main>
    );
  }

  return (
    <main className="app-shell mx-auto min-h-screen w-full max-w-md px-4 pb-10 pt-6">
      <div className="flex items-center gap-3">
        <Link href="/" aria-label="Back" className="text-[var(--text-tertiary)]">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="font-heading text-xl font-semibold text-[var(--text-primary)]">
            Seller verification
          </h1>
          <p className="text-xs text-[var(--text-tertiary)]">
            Review submitted documents, then approve or reject.
          </p>
        </div>
      </div>

      {migrationRequired ? (
        <p className="mt-4 rounded-xl border border-[#FAC77540] bg-[#FAC77518] px-3 py-2.5 text-sm text-[#FAC775]">
          Run migration{" "}
          <code className="text-[11px]">20260917100000_seller_verification_status.sql</code> in
          Supabase for full approve/reject status tracking.
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-[#F0959540] bg-[#F0959518] px-3 py-2.5 text-sm text-[#F09595]"
        >
          {error}
        </p>
      ) : null}

      <p className="mt-4 text-xs text-[var(--text-tertiary)]">
        Payment gating can be added later so only paid applications appear here.
      </p>

      {sellers.length === 0 ? (
        <div className="glass-card mt-6 px-4 py-10 text-center">
          <p className="text-sm text-[var(--text-secondary)]">No pending verifications.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {sellers.map((seller) => {
            const country = unwrap(seller.african_countries);
            const account = unwrap(seller.users);
            const busy = actingId === seller.id;

            return (
              <li key={seller.id} className="glass-card space-y-3 p-4">
                <div>
                  <p className="font-heading text-base font-semibold text-[var(--text-primary)]">
                    {seller.farm_name}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                    {country ? `${country.flag_emoji} ${country.name}` : "Country unknown"}
                    {" · "}
                    {seller.state_region}
                    {seller.local_area ? `, ${seller.local_area}` : ""}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-xs text-[var(--text-secondary)]">
                  <p>
                    <span className="text-[var(--text-tertiary)]">Owner:</span>{" "}
                    {account?.full_name || "—"} ({account?.email || "no email"})
                  </p>
                  <p className="mt-1">
                    <span className="text-[var(--text-tertiary)]">WhatsApp:</span>{" "}
                    {seller.whatsapp_number}
                  </p>
                  <p className="mt-1">
                    <span className="text-[var(--text-tertiary)]">Document:</span>{" "}
                    {seller.verification_document_type} — {seller.verification_document_value}
                  </p>
                  <p className="mt-1">
                    <span className="text-[var(--text-tertiary)]">Submitted:</span>{" "}
                    {new Date(seller.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void approve(seller.id)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#1D9E75] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    <BadgeCheck size={16} />
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void reject(seller.id, seller.farm_name)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#F0959540] bg-[#F0959518] py-2.5 text-sm font-semibold text-[#F09595] disabled:opacity-60"
                  >
                    <ShieldX size={16} />
                    Reject
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
