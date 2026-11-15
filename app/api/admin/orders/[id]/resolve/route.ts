import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/orders/adminAuth";
import { completeOrder, refundOrder, type OrderRow } from "@/lib/orders/server";

export const dynamic = "force-dynamic";

/**
 * Admin decides a reported problem (or steps in on any active order):
 * refund_full, refund_partial (with amount) or release_to_seller.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const { admin, user } = ctx;
  const body = (await request.json().catch(() => ({}))) as { resolution?: string; amount?: number; note?: string };
  const { data } = await admin.from("orders").select("*").eq("id", id).maybeSingle();
  const order = data as OrderRow | null;
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (!["paid", "dispatched", "disputed"].includes(order.status)) {
    return NextResponse.json({ error: `This order is ${order.status}; nothing to decide.` }, { status: 400 });
  }

  try {
    let refundAmount: number | null = null;
    if (body.resolution === "refund_full") {
      await refundOrder(admin, order);
      refundAmount = Number(order.total);
    } else if (body.resolution === "refund_partial") {
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0 || amount >= Number(order.total)) {
        return NextResponse.json({ error: "Enter a partial refund less than the order total." }, { status: 400 });
      }
      await refundOrder(admin, order, amount);
      refundAmount = amount;
    } else if (body.resolution === "release_to_seller") {
      await completeOrder(admin, order.id, "admin");
    } else {
      return NextResponse.json({ error: "Choose an outcome." }, { status: 400 });
    }
    await admin
      .from("order_disputes")
      .update({
        status: "resolved",
        resolution: body.resolution,
        refund_amount: refundAmount,
        admin_note: (body.note ?? "").slice(0, 1000) || null,
        resolved_by: user.id,
        resolved_at: new Date().toISOString()
      })
      .eq("order_id", order.id)
      .eq("status", "open");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't complete that." }, { status: 502 });
  }
}
