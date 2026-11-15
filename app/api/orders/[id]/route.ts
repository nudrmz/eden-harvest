import { NextResponse } from "next/server";
import { orderContext, viewerRole } from "@/lib/orders/auth";
import type { OrderRow } from "@/lib/orders/server";

export const dynamic = "force-dynamic";

/** One order, as the buyer, the farmer or an admin may see it. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, admin, sellerId, isAdmin } = await orderContext();
  if (!user || !admin) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { data } = await admin.from("orders").select("*").eq("id", id).maybeSingle();
  const order = data as OrderRow | null;
  const role = order ? viewerRole(order, { userId: user.id, sellerId, isAdmin }) : null;
  if (!order || !role) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  const [{ data: farm }, { data: disputes }] = await Promise.all([
    admin.from("seller_profiles").select("farm_name, state_region").eq("id", order.seller_id).maybeSingle(),
    admin.from("order_disputes").select("*").eq("order_id", order.id).order("created_at", { ascending: false })
  ]);

  // Farmers only get the buyer's delivery details once the order is paid.
  const hideDelivery = role === "seller" && order.status === "pending_payment";
  return NextResponse.json(
    {
      role,
      order: hideDelivery ? { ...order, delivery_phone: null, delivery_address: null } : order,
      farm: farm ?? null,
      disputes: disputes ?? []
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
