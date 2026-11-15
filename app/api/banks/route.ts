import { NextResponse } from "next/server";
import { listBanks } from "@/lib/payments/paystack";

export const revalidate = 86400;

/** Nigerian banks Paystack can pay into (for the farmer payout form). */
export async function GET() {
  try {
    const banks = (await listBanks()).filter((b) => b.active).map((b) => ({ name: b.name, code: b.code }));
    return NextResponse.json({ banks });
  } catch (error) {
    return NextResponse.json({ banks: [], error: error instanceof Error ? error.message : "Unavailable" }, { status: 503 });
  }
}
