import { NextResponse } from "next/server";
import { fetchCountrySellerClusters } from "@/lib/data/listings";

export async function GET() {
  try {
    const clusters = await fetchCountrySellerClusters();
    return NextResponse.json({ clusters });
  } catch (error) {
    console.error("map-sellers API error:", error);
    return NextResponse.json({ clusters: [] });
  }
}
