import { NextResponse } from "next/server";
import { getExchangeRates } from "@/lib/data/exchange-rates";

export async function GET() {
  try {
    const rates = await getExchangeRates();
    return NextResponse.json({
      base: "NGN",
      rates,
      fetchedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("exchange-rates error:", error);
    return NextResponse.json({ error: "Failed to load exchange rates" }, { status: 500 });
  }
}
