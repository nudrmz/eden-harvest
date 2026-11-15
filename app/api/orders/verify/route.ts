import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { confirmPayment } from "@/lib/orders/server";

export const dynamic = "force-dynamic";

/** Paystack sends the buyer back here after paying. */
export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference") ?? request.nextUrl.searchParams.get("trxref");
  const admin = createAdminClient();
  if (!reference || !admin) return NextResponse.redirect(new URL("/orders", request.url));
  try {
    const order = await confirmPayment(admin, reference);
    if (order) return NextResponse.redirect(new URL(`/orders/${order.id}?paid=1`, request.url));
  } catch (error) {
    console.error("payment verify failed", error);
  }
  return NextResponse.redirect(new URL("/orders", request.url));
}
