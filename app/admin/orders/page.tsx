"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { money, when } from "@/lib/orders/format";
import { STATUS_LABEL, type OrderStatus } from "@/lib/orders/config";

interface Dispute {
  id: string;
  reason: string;
  details: string;
  photo_urls: string[];
  status: string;
  created_at: string;
}

interface AdminOrder {
  id: string;
  order_number: string;
  product_name: string;
  quantity: number;
  unit: string;
  total: number;
  currency: string;
  seller_payout: number;
  status: OrderStatus;
  payout_status: string;
  created_at: string;
  farm_name: string;
  buyer_name: string;
  payout_account: string | null;
  disputes: Dispute[];
}

const VIEWS = [
  ["attention", "Needs action"],
  ["active", "In progress"],
  ["all", "All"]
] as const;

export default function AdminOrdersPage() {
  const [view, setView] = useState<(typeof VIEWS)[number][0]>("attention");
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setOrders(null);
    const res = await fetch(`/api/admin/orders?view=${view}`, { cache: "no-store" });
    const body = await res.json();
    if (!res.ok) setError(body.error ?? "Couldn't load orders.");
    else setOrders(body.orders);
  }, [view]);

  useEffect(() => {
    void load();
  }, [load]);

  async function post(id: string, path: string, payload?: unknown, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusyId(id);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/orders/${id}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload ?? {})
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "That didn't work.");
      setNotice("Done.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="app-shell mx-auto min-h-screen w-full max-w-md px-4 pb-16 pt-6 text-[var(--text-primary)]">
      <Link href="/profile" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
        <ArrowLeft size={16} /> Profile
      </Link>
      <h1 className="mt-4 font-heading text-2xl font-bold">Orders</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">Problems to decide and farmer payouts to send.</p>

      <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl border border-white/10 p-1">
        {VIEWS.map(([k, l]) => (
          <button key={k} type="button" onClick={() => setView(k)} className={`rounded-lg py-2 text-sm font-semibold ${view === k ? "bg-[#1D9E75] text-white" : "text-[var(--text-secondary)]"}`}>
            {l}
          </button>
        ))}
      </div>

      {error ? <p className="mt-3 text-sm text-[#F09595]">{error}</p> : null}
      {notice ? <p className="mt-3 text-sm text-[#1D9E75]">{notice}</p> : null}
      {!orders && !error ? <p className="mt-6 text-sm text-[var(--text-secondary)]">Loading…</p> : null}
      {orders && !orders.length ? <p className="glass-card mt-4 p-4 text-sm text-[var(--text-secondary)]">Nothing here.</p> : null}

      <ul className="mt-4 space-y-3">
        {orders?.map((o) => {
          const openDispute = o.disputes.find((d) => d.status === "open");
          const busy = busyId === o.id;
          return (
            <li key={o.id} className="glass-card p-4 text-sm">
              <div className="flex justify-between gap-3">
                <Link href={`/orders/${o.id}`} className="min-w-0 font-semibold underline-offset-2 hover:underline">
                  {o.product_name} × {o.quantity} {o.unit}
                </Link>
                <span className="shrink-0 font-semibold">{money(o.total, o.currency)}</span>
              </div>
              <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                {o.order_number} · {when(o.created_at)} · {o.buyer_name} → {o.farm_name}
              </p>
              <p className="mt-1 text-xs">
                <span className="font-semibold">{STATUS_LABEL[o.status] ?? o.status}</span> · payout {o.payout_status.replace(/_/g, " ")} (
                {money(o.seller_payout, o.currency)})
              </p>

              {openDispute ? (
                <div className="mt-3 rounded-xl border border-[#F09595]/40 bg-[#F09595]/10 p-3">
                  <p className="font-semibold text-[#F09595]">Problem: {openDispute.reason.replace(/_/g, " ")}</p>
                  <p className="mt-1 text-[var(--text-secondary)]">{openDispute.details}</p>
                  {openDispute.photo_urls.map((u) => (
                    <a key={u} href={u} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-eden-gold underline">Buyer&apos;s photo</a>
                  ))}
                </div>
              ) : null}

              {["paid", "dispatched", "disputed"].includes(o.status) ? (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button type="button" disabled={busy} onClick={() => void post(o.id, "resolve", { resolution: "refund_full" }, `Refund ${money(o.total, o.currency)} in full to the buyer?`)} className="rounded-lg border border-[#F09595]/50 py-2 text-xs font-semibold text-[#F09595]">
                    Full refund
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      const v = window.prompt(`Partial refund amount (${o.currency}), less than ${o.total}:`);
                      if (v) void post(o.id, "resolve", { resolution: "refund_partial", amount: Number(v) });
                    }}
                    className="rounded-lg border border-eden-gold/50 py-2 text-xs font-semibold text-eden-gold"
                  >
                    Part refund
                  </button>
                  <button type="button" disabled={busy} onClick={() => void post(o.id, "resolve", { resolution: "release_to_seller" }, "Close this and pay the farmer?")} className="rounded-lg border border-[#1D9E75]/50 py-2 text-xs font-semibold text-[#1D9E75]">
                    Pay farmer
                  </button>
                </div>
              ) : null}

              {o.status === "completed" && ["due", "failed"].includes(o.payout_status) ? (
                <div className="mt-3">
                  <p className="text-xs text-[var(--text-tertiary)]">{o.payout_account ? `To: ${o.payout_account}` : "Farmer has no payout account yet."}</p>
                  <button
                    type="button"
                    disabled={busy || !o.payout_account}
                    onClick={() => void post(o.id, "payout", {}, `Send ${money(o.seller_payout, o.currency)} to ${o.payout_account}?`)}
                    className="mt-2 w-full rounded-lg bg-[#1D9E75] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {busy ? "Sending…" : `Send payout ${money(o.seller_payout, o.currency)}`}
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
