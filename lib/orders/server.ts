import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DAY_MS, DISPATCH_DAYS, RELEASE_DAYS_AFTER_DISPATCH, roundMoney } from "@/lib/orders/config";
import { refundTransaction, verifyTransaction, fromMinor } from "@/lib/payments/paystack";

export interface OrderRow {
  id: string;
  order_number: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string | null;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  subtotal: number;
  delivery_fee: number;
  total: number;
  currency: string;
  commission_rate: number;
  commission_amount: number;
  seller_payout: number;
  status: string;
  payment_provider: string | null;
  payment_reference: string | null;
  paid_at: string | null;
  dispatch_due_at: string | null;
  dispatched_at: string | null;
  dispatch_note: string | null;
  dispatch_proof_url: string | null;
  auto_release_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
  payout_status: string;
  payout_reference: string | null;
  payout_paid_at: string | null;
  refund_amount: number | null;
  refunded_at: string | null;
  delivery_name: string | null;
  delivery_phone: string | null;
  delivery_address: string | null;
  buyer_note: string | null;
  created_at: string;
  updated_at: string;
}

const now = () => new Date().toISOString();

/**
 * Confirms a Paystack payment and marks the order paid. Safe to call from
 * both the browser redirect and the webhook; only the first call changes it.
 */
export async function confirmPayment(admin: SupabaseClient, reference: string): Promise<OrderRow | null> {
  const { data: order } = await admin.from("orders").select("*").eq("payment_reference", reference).maybeSingle();
  if (!order) return null;
  if (order.status !== "pending_payment") return order as OrderRow;

  const tx = await verifyTransaction(reference);
  const paidEnough =
    tx.status === "success" &&
    tx.currency === order.currency &&
    fromMinor(tx.amount) + 0.001 >= Number(order.total);
  if (!paidEnough) return order as OrderRow;

  const paidAt = tx.paid_at ?? now();
  const { data: updated } = await admin
    .from("orders")
    .update({
      status: "paid",
      paid_at: paidAt,
      dispatch_due_at: new Date(new Date(paidAt).getTime() + DISPATCH_DAYS * DAY_MS).toISOString(),
      updated_at: now()
    })
    .eq("id", order.id)
    .eq("status", "pending_payment")
    .select("*")
    .maybeSingle();
  return (updated ?? order) as OrderRow;
}

export async function markDispatched(
  admin: SupabaseClient,
  orderId: string,
  details: { note: string | null; proofUrl: string | null }
) {
  const at = new Date();
  return admin
    .from("orders")
    .update({
      status: "dispatched",
      dispatched_at: at.toISOString(),
      dispatch_note: details.note,
      dispatch_proof_url: details.proofUrl,
      auto_release_at: new Date(at.getTime() + RELEASE_DAYS_AFTER_DISPATCH * DAY_MS).toISOString(),
      updated_at: now()
    })
    .eq("id", orderId)
    .eq("status", "paid")
    .select("*")
    .maybeSingle();
}

/** Buyer confirmed, or the protection window ran out: the farmer's payout becomes due. */
export async function completeOrder(admin: SupabaseClient, orderId: string, by: "buyer" | "auto" | "admin") {
  return admin
    .from("orders")
    .update({
      status: "completed",
      completed_at: now(),
      completed_by: by,
      payout_status: "due",
      updated_at: now()
    })
    .eq("id", orderId)
    .in("status", by === "admin" ? ["dispatched", "disputed", "paid"] : ["dispatched"])
    .select("*")
    .maybeSingle();
}

/** Refund the buyer (all or part) through Paystack and close the order. */
export async function refundOrder(admin: SupabaseClient, order: OrderRow, amount?: number) {
  if (!order.payment_reference) throw new Error("This order has no payment to refund.");
  const refund = amount && amount < Number(order.total) ? roundMoney(amount) : Number(order.total);
  await refundTransaction(order.payment_reference, refund < Number(order.total) ? refund : undefined);
  const partial = refund < Number(order.total);
  const update: Record<string, unknown> = {
    refund_amount: refund,
    refunded_at: now(),
    updated_at: now()
  };
  if (partial) {
    // Farmer still gets paid for what was delivered, minus the refund.
    const remainingSubtotal = Math.max(Number(order.subtotal) - refund, 0);
    const commission = roundMoney(remainingSubtotal * Number(order.commission_rate));
    update.status = "completed";
    update.completed_at = now();
    update.completed_by = "admin";
    update.commission_amount = commission;
    update.seller_payout = roundMoney(Number(order.total) - refund - commission);
    update.payout_status = "due";
  } else {
    update.status = "refunded";
    update.payout_status = "cancelled";
  }
  return admin.from("orders").update(update).eq("id", order.id).select("*").maybeSingle();
}

/**
 * Housekeeping, run by the daily cron and whenever order lists load:
 * completes dispatched orders whose protection window has passed, and
 * cancels + refunds paid orders the farmer never dispatched.
 */
export async function sweepOrders(admin: SupabaseClient): Promise<{ completed: number; refunded: number }> {
  const nowIso = now();
  let completed = 0;
  let refunded = 0;
  const { data: due } = await admin
    .from("orders")
    .select("id")
    .eq("status", "dispatched")
    .lte("auto_release_at", nowIso)
    .limit(100);
  for (const o of due ?? []) {
    const { data } = await completeOrder(admin, o.id as string, "auto");
    if (data) completed += 1;
  }
  const { data: late } = await admin
    .from("orders")
    .select("*")
    .eq("status", "paid")
    .lte("dispatch_due_at", nowIso)
    .limit(50);
  for (const o of (late ?? []) as OrderRow[]) {
    try {
      await refundOrder(admin, o);
      await admin.from("orders").update({ status: "cancelled" }).eq("id", o.id);
      refunded += 1;
    } catch (error) {
      console.error("auto-refund failed", o.order_number, error);
    }
  }
  return { completed, refunded };
}
