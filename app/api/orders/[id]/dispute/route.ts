import { NextRequest, NextResponse } from "next/server";
import { orderContext } from "@/lib/orders/auth";

export const dynamic = "force-dynamic";

const REASONS = ["not_received", "wrong_item", "damaged_or_spoiled", "short_quantity", "other"];

/** Buyer: something's wrong. Freezes the farmer's payout until an admin decides. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, admin } = await orderContext();
  if (!user || !admin) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { reason?: string; details?: string; photoUrls?: string[] };
  const reason = REASONS.includes(body.reason ?? "") ? body.reason! : null;
  const details = (body.details ?? "").trim().slice(0, 2000);
  if (!reason || details.length < 10) {
    return NextResponse.json({ error: "Choose what went wrong and describe it in a sentence or two." }, { status: 400 });
  }
  const { data: order } = await admin.from("orders").select("id, buyer_id, status").eq("id", id).maybeSingle();
  if (!order || order.buyer_id !== user.id) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (!["paid", "dispatched"].includes(order.status as string)) {
    return NextResponse.json({ error: "Problems can be reported until you confirm the order or it completes." }, { status: 400 });
  }
  const photos = (Array.isArray(body.photoUrls) ? body.photoUrls : []).filter((u) => typeof u === "string").slice(0, 5);
  const { error } = await admin
    .from("order_disputes")
    .insert({ order_id: id, opened_by: user.id, reason, details, photo_urls: photos });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await admin.from("orders").update({ status: "disputed", updated_at: new Date().toISOString() }).eq("id", id);
  return NextResponse.json({ ok: true });
}
