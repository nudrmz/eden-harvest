import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/orders/adminAuth";
import { initiateTransfer } from "@/lib/payments/paystack";

export const dynamic = "force-dynamic";

/**
 * Admin: pay the farmer for a completed order from the Paystack balance.
 * Kept as a deliberate admin step (not automatic) while the business is
 * starting out, so every payout is checked by a person.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const { admin } = ctx;
  const { data: order } = await admin.from("orders").select("*").eq("id", id).maybeSingle();
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.status !== "completed" || !["due", "failed"].includes(order.payout_status as string)) {
    return NextResponse.json({ error: "This order isn't due a payout." }, { status: 400 });
  }
  const { data: account } = await admin
    .from("seller_payout_accounts")
    .select("paystack_recipient_code")
    .eq("seller_id", order.seller_id)
    .maybeSingle();
  if (!account?.paystack_recipient_code) {
    return NextResponse.json({ error: "The farmer hasn't added a payout bank account yet." }, { status: 400 });
  }
  const reference = `PAYOUT-${order.order_number}-${Date.now().toString(36)}`.toLowerCase();
  // Claim it first so a double tap can't pay twice.
  const { data: claimed } = await admin
    .from("orders")
    .update({ payout_status: "processing", payout_reference: reference })
    .eq("id", id)
    .in("payout_status", ["due", "failed"])
    .select("id")
    .maybeSingle();
  if (!claimed) return NextResponse.json({ error: "Payout already in progress." }, { status: 409 });
  try {
    const transfer = await initiateTransfer({
      amount: Number(order.seller_payout),
      recipient: account.paystack_recipient_code as string,
      reference,
      reason: `Eden Harvest order ${order.order_number}`
    });
    if (transfer.status === "success") {
      await admin.from("orders").update({ payout_status: "paid", payout_paid_at: new Date().toISOString() }).eq("id", id);
    }
    return NextResponse.json({ ok: true, status: transfer.status });
  } catch (err) {
    await admin.from("orders").update({ payout_status: "failed" }).eq("id", id);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Transfer failed." }, { status: 502 });
  }
}
