"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ChevronRight, Package } from "lucide-react";
import { useAuth } from "@/lib/supabase/hooks";
import { money, when } from "@/lib/orders/format";
import { STATUS_LABEL, type OrderStatus } from "@/lib/orders/config";

interface OrderSummary {
  id: string;
  order_number: string;
  product_name: string;
  quantity: number;
  unit: string;
  total: number;
  seller_payout: number;
  currency: string;
  status: OrderStatus;
  payout_status: string;
  created_at: string;
  farm_name?: string | null;
}

const TONE: Record<string, string> = {
  paid: "text-eden-gold",
  dispatched: "text-eden-gold",
  completed: "text-[#1D9E75]",
  disputed: "text-[#F09595]",
  refunded: "text-[var(--text-tertiary)]",
  cancelled: "text-[var(--text-tertiary)]",
  pending_payment: "text-[var(--text-tertiary)]"
};

export default function OrdersPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [data, setData] = useState<{ isSeller: boolean; bought: OrderSummary[]; sold: OrderSummary[] } | null>(null);
  const [tab, setTab] = useState<"bought" | "sold">("bought");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login?redirect=/orders");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const res = await fetch("/api/orders", { cache: "no-store" });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Couldn't load orders.");
        setData(body);
        if (body.isSeller && body.sold.length && !body.bought.length) setTab("sold");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't load orders.");
      }
    })();
  }, [user]);

  const list = data ? (tab === "sold" ? data.sold : data.bought) : [];

  return (
    <main className="app-shell mx-auto min-h-screen w-full max-w-md px-4 pb-16 pt-6 text-[var(--text-primary)]">
      <Link href="/profile" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
        <ArrowLeft size={16} /> Profile
      </Link>
      <h1 className="mt-4 font-heading text-2xl font-bold">Orders</h1>

      {data?.isSeller ? (
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl border border-white/10 p-1">
          {(["bought", "sold"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-lg py-2 text-sm font-semibold ${tab === t ? "bg-[#1D9E75] text-white" : "text-[var(--text-secondary)]"}`}
            >
              {t === "bought" ? "My purchases" : `Farm orders${data.sold.length ? ` (${data.sold.length})` : ""}`}
            </button>
          ))}
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-[#F09595]">{error}</p> : null}
      {!data && !error ? <p className="mt-6 text-sm text-[var(--text-secondary)]">Loading…</p> : null}
      {data && !list.length ? (
        <div className="glass-card mt-6 p-6 text-center text-sm text-[var(--text-secondary)]">
          <Package className="mx-auto mb-2" size={28} />
          {tab === "sold" ? "No orders for your farm yet." : "You haven't ordered anything yet."}
          {tab === "bought" ? (
            <Link href="/browse" className="mt-2 block font-semibold text-eden-gold">Browse produce</Link>
          ) : null}
        </div>
      ) : null}

      <ul className="mt-4 space-y-2">
        {list.map((o) => (
          <li key={o.id}>
            <Link href={`/orders/${o.id}`} className="glass-card flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {o.product_name} <span className="font-normal text-[var(--text-secondary)]">× {o.quantity} {o.unit}</span>
                </p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {o.order_number} · {when(o.created_at)}
                  {o.farm_name ? ` · ${o.farm_name}` : ""}
                </p>
                <p className={`mt-0.5 text-xs font-semibold ${TONE[o.status] ?? ""}`}>{STATUS_LABEL[o.status] ?? o.status}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{money(tab === "sold" ? o.seller_payout : o.total, o.currency)}</p>
                {tab === "sold" ? <p className="text-[11px] text-[var(--text-tertiary)]">your payout</p> : null}
              </div>
              <ChevronRight size={16} className="text-[var(--text-tertiary)]" />
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
