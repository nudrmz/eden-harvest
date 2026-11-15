import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidWebhook } from "@/lib/payments/paystack";
import { confirmPayment } from "@/lib/orders/server";

export const dynamic = "force-dynamic";

/**
 * Paystack webhook (Settings → API Keys & Webhooks → Webhook URL:
 * https://edenharvest.app/api/webhooks/paystack). Backs up the browser
 * redirect, so an order is marked paid even if the buyer closes the tab,
 * and records payout transfer results.
 */
export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (!isValidWebhook(raw, request.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }
  const event = JSON.parse(raw) as { event?: string; data?: { reference?: string } };
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: true });
  const reference = event.data?.reference;

  try {
    if (event.event === "charge.success" && reference) {
      await confirmPayment(admin, reference);
    } else if (reference && (event.event === "transfer.success" || event.event === "transfer.failed" || event.event === "transfer.reversed")) {
      await admin
        .from("orders")
        .update(
          event.event === "transfer.success"
            ? { payout_status: "paid", payout_paid_at: new Date().toISOString() }
            : { payout_status: "failed" }
        )
        .eq("payout_reference", reference);
    }
  } catch (error) {
    console.error("paystack webhook", event.event, error);
  }
  return NextResponse.json({ ok: true });
}
