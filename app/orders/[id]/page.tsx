"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, ShieldCheck, Truck } from "lucide-react";
import { money, when } from "@/lib/orders/format";
import { STATUS_LABEL, type OrderStatus } from "@/lib/orders/config";
import { uploadPhoto } from "@/lib/storage/photos";
import { trackOnce } from "@/lib/analytics/google";

interface Order {
  id: string;
  order_number: string;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  subtotal: number;
  delivery_fee: number;
  total: number;
  currency: string;
  commission_amount: number;
  seller_payout: number;
  status: OrderStatus;
  payout_status: string;
  paid_at: string | null;
  dispatch_due_at: string | null;
  dispatched_at: string | null;
  dispatch_note: string | null;
  dispatch_proof_url: string | null;
  auto_release_at: string | null;
  completed_at: string | null;
  refund_amount: number | null;
  delivery_name: string | null;
  delivery_phone: string | null;
  delivery_address: string | null;
  buyer_note: string | null;
  listing_id: string | null;
  created_at: string;
}

interface Detail {
  role: "buyer" | "seller" | "admin";
  order: Order;
  farm: { farm_name: string; state_region: string } | null;
  disputes: { id: string; reason: string; details: string; status: string; resolution: string | null; created_at: string }[];
}

const REASONS: [string, string][] = [
  ["not_received", "It hasn't arrived"],
  ["wrong_item", "Wrong item"],
  ["damaged_or_spoiled", "Damaged or spoiled"],
  ["short_quantity", "Less than I paid for"],
  ["other", "Something else"]
];

const field = "eden-field-input !px-4 !py-3 !text-base";

function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const justPaid = useSearchParams().get("paid") === "1";
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState<"dispatch" | "problem" | null>(null);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [reason, setReason] = useState("not_received");

  const load = useCallback(async () => {
    const res = await fetch(`/api/orders/${id}`, { cache: "no-store" });
    const body = await res.json();
    if (!res.ok) setError(body.error ?? "Couldn't load this order.");
    else setData(body as Detail);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Google Ads / Analytics conversion: once per order, when the buyer lands back after paying.
  useEffect(() => {
    if (!justPaid || !data || data.role !== "buyer" || data.order.status === "pending_payment") return;
    const o = data.order;
    trackOnce(`purchase:${o.id}`, "purchase", {
      transaction_id: o.order_number,
      currency: o.currency,
      value: Number(o.total),
      shipping: Number(o.delivery_fee),
      items: [{ item_id: o.listing_id ?? o.id, item_name: o.product_name, price: Number(o.unit_price), quantity: Number(o.quantity) }]
    });
  }, [justPaid, data]);

  async function act(path: string, payload?: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${id}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload ?? {})
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
      setPanel(null);
      setNote("");
      setPhoto(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function withPhoto(): Promise<string | null | undefined> {
    if (!photo) return null;
    const { url, error: uploadError } = await uploadPhoto(photo, "proof");
    if (uploadError) {
      setError(uploadError);
      return undefined;
    }
    return url;
  }

  async function dispatch() {
    setBusy(true);
    const url = await withPhoto();
    setBusy(false);
    if (url === undefined) return;
    await act("dispatch", { note, proofUrl: url });
  }

  async function report() {
    setBusy(true);
    const url = await withPhoto();
    setBusy(false);
    if (url === undefined) return;
    await act("dispute", { reason, details: note, photoUrls: url ? [url] : [] });
  }

  if (error && !data) return <p className="mt-6 text-sm text-[#F09595]">{error}</p>;
  if (!data) return <p className="mt-6 text-sm text-[var(--text-secondary)]">Loading…</p>;
  const { order: o, role, farm } = data;
  const c = o.currency;

  return (
    <>
      {justPaid && o.status === "paid" && role === "buyer" ? (
        <div className="mt-4 flex gap-2 rounded-xl border border-[#1D9E75]/50 bg-[#1D9E75]/15 p-3 text-sm">
          <CheckCircle2 size={18} className="shrink-0 text-[#1D9E75]" />
          <p>Payment received. {farm?.farm_name ?? "The farmer"} has been told and has until {when(o.dispatch_due_at)} to dispatch your order.</p>
        </div>
      ) : null}

      <section className="glass-card mt-4 p-4">
        <p className="text-xs text-[var(--text-tertiary)]">{o.order_number} · {when(o.created_at)}</p>
        <p className="mt-1 text-lg font-bold">
          {o.product_name} <span className="font-normal text-[var(--text-secondary)]">× {o.quantity} {o.unit}</span>
        </p>
        <p className="text-sm text-[var(--text-secondary)]">{farm?.farm_name}{farm?.state_region ? ` · ${farm.state_region}` : ""}</p>
        <p className="mt-2 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">{STATUS_LABEL[o.status] ?? o.status}</p>

        <dl className="mt-4 space-y-1.5 text-sm">
          <Row k="Produce" v={money(o.subtotal, c)} />
          <Row k="Delivery" v={Number(o.delivery_fee) ? money(o.delivery_fee, c) : "Included"} />
          <Row k="Total paid" v={money(o.total, c)} bold />
          {role !== "buyer" ? (
            <>
              <Row k="Eden Harvest fee" v={`− ${money(o.commission_amount, c)}`} />
              <Row k="Farmer payout" v={money(o.seller_payout, c)} bold />
              <Row k="Payout" v={o.payout_status.replace(/_/g, " ")} />
            </>
          ) : null}
          {o.refund_amount ? <Row k="Refunded" v={money(o.refund_amount, c)} /> : null}
        </dl>
      </section>

      {role !== "buyer" && o.status !== "pending_payment" ? (
        <section className="glass-card mt-3 p-4 text-sm">
          <h2 className="font-semibold">Deliver to</h2>
          <p className="mt-1">{o.delivery_name}</p>
          <p>{o.delivery_phone}</p>
          <p className="whitespace-pre-line text-[var(--text-secondary)]">{o.delivery_address}</p>
          {o.buyer_note ? <p className="mt-2 text-[var(--text-secondary)]">Note: {o.buyer_note}</p> : null}
        </section>
      ) : null}

      <section className="glass-card mt-3 p-4 text-sm">
        <h2 className="font-semibold">Progress</h2>
        <ol className="mt-2 space-y-1.5 text-[var(--text-secondary)]">
          <li>Paid: {when(o.paid_at)}</li>
          <li>
            Dispatched: {o.dispatched_at ? when(o.dispatched_at) : o.dispatch_due_at ? `due by ${when(o.dispatch_due_at)}` : "—"}
          </li>
          {o.dispatch_note ? <li>Farmer&apos;s note: {o.dispatch_note}</li> : null}
          {o.dispatch_proof_url ? (
            <li>
              <a href={o.dispatch_proof_url} target="_blank" rel="noreferrer" className="text-eden-gold underline">Dispatch photo</a>
            </li>
          ) : null}
          <li>
            Completed: {o.completed_at ? when(o.completed_at) : o.auto_release_at ? `payment releases to farmer ${when(o.auto_release_at)} unless a problem is reported` : "—"}
          </li>
        </ol>
      </section>

      {data.disputes.length ? (
        <section className="glass-card mt-3 p-4 text-sm">
          <h2 className="font-semibold">Problem reports</h2>
          {data.disputes.map((d) => (
            <div key={d.id} className="mt-2 border-t border-white/10 pt-2">
              <p className="font-semibold">{REASONS.find((r) => r[0] === d.reason)?.[1] ?? d.reason} · {d.status}</p>
              <p className="text-[var(--text-secondary)]">{d.details}</p>
              {d.resolution ? <p className="text-xs text-[var(--text-tertiary)]">Outcome: {d.resolution.replace(/_/g, " ")}</p> : null}
            </div>
          ))}
        </section>
      ) : null}

      {error ? <p className="mt-3 text-sm text-[#F09595]">{error}</p> : null}

      {/* Farmer actions */}
      {role === "seller" && o.status === "paid" ? (
        panel === "dispatch" ? (
          <section className="glass-card mt-3 space-y-3 p-4 text-sm">
            <h2 className="font-semibold">Mark as dispatched</h2>
            <p className="text-[var(--text-secondary)]">Add a photo of the packed goods and/or the courier, waybill or tracking details.</p>
            <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} className="text-xs" />
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500} placeholder="e.g. Sent with GIG Logistics, waybill 12345, arriving Thursday" className={`${field} resize-none`} />
            <button type="button" disabled={busy} onClick={() => void dispatch()} className="w-full rounded-xl bg-[#1D9E75] py-3 font-semibold text-white disabled:opacity-60">
              {busy ? "Saving…" : "Confirm dispatch"}
            </button>
          </section>
        ) : (
          <button type="button" onClick={() => setPanel("dispatch")} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1D9E75] py-3.5 font-semibold text-white">
            <Truck size={16} /> Mark as dispatched
          </button>
        )
      ) : null}

      {/* Buyer actions */}
      {role === "buyer" && o.status === "dispatched" ? (
        <button type="button" disabled={busy} onClick={() => void act("confirm")} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1D9E75] py-3.5 font-semibold text-white disabled:opacity-60">
          <CheckCircle2 size={16} /> Received – all good
        </button>
      ) : null}
      {role === "buyer" && (o.status === "paid" || o.status === "dispatched") ? (
        panel === "problem" ? (
          <section className="glass-card mt-3 space-y-3 p-4 text-sm">
            <h2 className="font-semibold">Report a problem</h2>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className={field}>
              {REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} maxLength={2000} placeholder="What happened? Include what arrived and when." className={`${field} resize-none`} />
            <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} className="text-xs" />
            <p className="text-xs text-[var(--text-tertiary)]">The farmer&apos;s payment is held while we look into it.</p>
            <button type="button" disabled={busy} onClick={() => void report()} className="w-full rounded-xl border border-[#F09595]/60 py-3 font-semibold text-[#F09595] disabled:opacity-60">
              {busy ? "Sending…" : "Send report"}
            </button>
          </section>
        ) : (
          <button type="button" onClick={() => setPanel("problem")} className="mt-2 w-full rounded-xl border border-white/15 py-3 text-sm font-semibold text-[var(--text-secondary)]">
            Report a problem
          </button>
        )
      ) : null}

      <div className="mt-5 flex gap-2 text-xs text-[var(--text-tertiary)]">
        <ShieldCheck size={16} className="shrink-0 text-[#1D9E75]" />
        <p>
          Covered by <Link href="/buyer-protection" className="underline">Buyer Protection</Link>.
        </p>
      </div>
    </>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[var(--text-tertiary)]">{k}</dt>
      <dd className={bold ? "font-semibold" : ""}>{v}</dd>
    </div>
  );
}

export default function OrderPage() {
  return (
    <main className="app-shell mx-auto min-h-screen w-full max-w-md px-4 pb-16 pt-6 text-[var(--text-primary)]">
      <Link href="/orders" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
        <ArrowLeft size={16} /> Orders
      </Link>
      <Suspense fallback={null}>
        <OrderDetail />
      </Suspense>
    </main>
  );
}
