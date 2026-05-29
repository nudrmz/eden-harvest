import { NextRequest, NextResponse } from "next/server";
import {
  fetchListingsForBrowse,
  resolveCountryIdByName
} from "@/lib/data/listings";
import type { BrowseListingsParams } from "@/lib/data/listings";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const countryName = searchParams.get("country") ?? "";
    const countryId =
      searchParams.get("countryId") ??
      (countryName ? await resolveCountryIdByName(countryName) : null);

    const params: BrowseListingsParams = {
      search: searchParams.get("q") ?? undefined,
      countryId: countryId ?? undefined,
      category: searchParams.get("category") ?? undefined,
      verifiedOnly: searchParams.get("verified") === "true",
      sortBy: (searchParams.get("sort") as BrowseListingsParams["sortBy"]) ?? "newest",
      maxPriceGbp: searchParams.has("maxPrice")
        ? Number(searchParams.get("maxPrice"))
        : undefined,
      minOrder: searchParams.has("minOrder") ? Number(searchParams.get("minOrder")) : undefined,
      limit: searchParams.has("limit") ? Number(searchParams.get("limit")) : 20
    };

    const listings = await fetchListingsForBrowse(params);
    return NextResponse.json({ listings });
  } catch (error) {
    console.error("listings API error:", error);
    return NextResponse.json({ listings: [] });
  }
}
