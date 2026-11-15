import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/orders/adminAuth";
import { sweepOrders } from "@/lib/orders/server";

export const dynamic = "force-dynamic";

/** Admin: orders by view — needs attention (disputes, payouts due), active, or all. */
export async function GET(request: NextRequest) {
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const { admin } = ctx;
  await sweepOrders(admin).catch(() => undefined);

  const view = request.nextUrl.searchParams.get("view") ?? "attention";
  let q = admin.from("orders").select("*").order("created_at", { ascending: false }).limit(200);
  if (view === "attention") q = q.or("status.eq.disputed,payout_status.eq.due,payout_status.eq.failed");
  else if (view === "active") q = q.in("status", ["paid", "dispatched"]);
  else q = q.neq("status", "pending_payment");
  const { data: orders, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const sellerIds = [...new Set((orders ?? []).map((o) => o.seller_id as string))];
  const buyerIds = [...new Set((orders ?? []).map((o) => o.buyer_id as string))];
  const orderIds = (orders ?? []).map((o) => o.id as string);
  const [{ data: farms }, { data: buyers }, { data: disputes }, { data: payouts }] = await Promise.all([
    sellerIds.length ? admin.from("seller_profiles").select("id, farm_name").in("id", sellerIds) : Promise.resolve({ data: [] }),
    buyerIds.length ? admin.from("users").select("id, full_name, email").in("id", buyerIds) : Promise.resolve({ data: [] }),
    orderIds.length ? admin.from("order_disputes").select("*").in("order_id", orderIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    sellerIds.length ? admin.from("seller_payout_accounts").select("seller_id, bank_name, account_name").in("seller_id", sellerIds) : Promise.resolve({ data: [] })
  ]);
  const farm = new Map((farms ?? []).map((f: { id: string; farm_name: string }) => [f.id, f.farm_name]));
  const buyer = new Map((buyers ?? []).map((b: { id: string; full_name: string | null; email: string }) => [b.id, b.full_name || b.email]));
  const payout = new Map(
    (payouts ?? []).map((p: { seller_id: string; bank_name: string; account_name: string }) => [p.seller_id, `${p.account_name} · ${p.bank_name}`])
  );

  return NextResponse.json(
    {
      orders: (orders ?? []).map((o) => ({
        ...o,
        farm_name: farm.get(o.seller_id as string) ?? "Unknown farm",
        buyer_name: buyer.get(o.buyer_id as string) ?? "Unknown buyer",
        payout_account: payout.get(o.seller_id as string) ?? null,
        disputes: (disputes ?? []).filter((d: { order_id: string }) => d.order_id === o.id)
      }))
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
