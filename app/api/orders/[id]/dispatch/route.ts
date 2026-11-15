import { NextRequest, NextResponse } from "next/server";
import { orderContext } from "@/lib/orders/auth";
import { markDispatched } from "@/lib/orders/server";

export const dynamic = "force-dynamic";

/** Farmer: the goods are on their way. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, admin, sellerId } = await orderContext();
  if (!user || !admin || !sellerId) return NextResponse.json({ error: "Seller sign-in required." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { note?: string; proofUrl?: string };
  const note = (body.note ?? "").trim().slice(0, 500) || null;
  const proofUrl = (body.proofUrl ?? "").trim().slice(0, 500) || null;
  if (!note && !proofUrl) {
    return NextResponse.json({ error: "Add a photo of the packed goods or a tracking / waybill note." }, { status: 400 });
  }
  const { data: order } = await admin.from("orders").select("id, seller_id, status").eq("id", id).maybeSingle();
  if (!order || order.seller_id !== sellerId) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.status !== "paid") return NextResponse.json({ error: "Only paid orders can be marked as dispatched." }, { status: 400 });
  const { data, error } = await markDispatched(admin, id, { note, proofUrl });
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Couldn't update the order." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
