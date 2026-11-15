import { NextResponse } from "next/server";
import { orderContext } from "@/lib/orders/auth";
import { completeOrder } from "@/lib/orders/server";

export const dynamic = "force-dynamic";

/** Buyer: received and happy, so the farmer can be paid. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, admin } = await orderContext();
  if (!user || !admin) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { data: order } = await admin.from("orders").select("id, buyer_id, status").eq("id", id).maybeSingle();
  if (!order || order.buyer_id !== user.id) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.status !== "dispatched") {
    return NextResponse.json({ error: "You can confirm once the farmer has dispatched the order." }, { status: 400 });
  }
  const { data, error } = await completeOrder(admin, id, "buyer");
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Couldn't update the order." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
