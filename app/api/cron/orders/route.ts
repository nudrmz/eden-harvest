import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sweepOrders } from "@/lib/orders/server";

export const dynamic = "force-dynamic";

/** Daily (vercel.json): release payments after the protection window, refund undispatched orders. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const ok = secret
    ? request.headers.get("authorization") === `Bearer ${secret}`
    : (request.headers.get("user-agent") ?? "").startsWith("vercel-cron");
  if (!ok) return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Not configured." }, { status: 500 });
  return NextResponse.json(await sweepOrders(admin));
}
