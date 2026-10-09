import { NextRequest, NextResponse } from "next/server";
import { isKnownCountry } from "@/lib/data/buyer-countries";

export const dynamic = "force-dynamic";

/** Visitor's country from Vercel's edge geolocation, used to pre-fill pickers. */
export function GET(request: NextRequest) {
  const raw = request.headers.get("x-vercel-ip-country")?.toUpperCase() ?? null;
  return NextResponse.json(
    { country: raw && isKnownCountry(raw) ? raw : null },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
