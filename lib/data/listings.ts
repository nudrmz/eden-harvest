import { createClient } from "@/lib/supabase/server";
import { COUNTRY_COORDINATES } from "@/lib/data/country-coordinates";
import {
  convertCurrency,
  formatMoney,
  getBuyerCurrency,
  getCurrencySymbol,
  getExchangeRates
} from "@/lib/data/exchange-rates";
import type {
  CountrySellerCluster,
  FeaturedListingDisplay,
  HomeStatsDisplay,
  ListingDisplay,
  StockStatus,
  VerifiedSellerCard
} from "@/lib/types/listing";
import { getInitials } from "@/lib/utils/helpers";

const LISTING_SELECT = `
  id,
  seller_id,
  product_name,
  category,
  price_local,
  price_currency_code,
  unit,
  min_order_quantity,
  min_order_unit,
  photo_url,
  stock_status,
  seasonal_months,
  is_featured,
  featured_until,
  created_at,
  seller_profiles!inner (
    id,
    farm_name,
    state_region,
    is_verified,
    average_rating,
    african_countries!inner (
      id,
      name,
      code,
      flag_emoji,
      currency_code,
      currency_symbol
    )
  )
`;

interface RawCountry {
  id: string;
  name: string;
  code: string;
  flag_emoji: string;
  currency_code: string;
  currency_symbol: string;
}

interface RawSellerProfile {
  id: string;
  farm_name: string;
  state_region: string;
  is_verified: boolean;
  average_rating: number | string;
  african_countries: RawCountry;
}

interface RawListingRow {
  id: string;
  seller_id: string;
  product_name: string;
  category: string;
  price_local: number | string;
  price_currency_code: string;
  unit: string;
  min_order_quantity: number | string;
  min_order_unit: string;
  photo_url: string | null;
  stock_status: StockStatus;
  seasonal_months: number[] | null;
  is_featured: boolean;
  featured_until: string | null;
  created_at: string;
  seller_profiles: RawSellerProfile;
}

export interface BrowseListingsParams {
  search?: string;
  countryId?: string;
  category?: string;
  verifiedOnly?: boolean;
  sortBy?: "newest" | "highest_rated" | "most_enquired" | "price_low_high" | "price_high_low";
  maxPriceGbp?: number;
  minOrder?: number;
  limit?: number;
}

const ACCENT_PALETTES = [
  ["#1f3f2d", "#142c20"],
  ["#2d4a28", "#1a3318"],
  ["#3d5a34", "#243820"],
  ["#1a4038", "#0f2820"],
  ["#4a3728", "#2d2218"],
  ["#283848", "#182430"]
];

function normalizeSeasonalMonths(months: number[] | null | undefined): number[] {
  const bar = Array(12).fill(0);
  if (!months?.length) return bar;
  if (months.length === 12 && months.every((m) => m === 0 || m === 1)) {
    return months;
  }
  for (const month of months) {
    if (month >= 1 && month <= 12) bar[month - 1] = 1;
  }
  return bar;
}

function accentForId(id: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash + id.charCodeAt(i)) % ACCENT_PALETTES.length;
  }
  return ACCENT_PALETTES[hash] as [string, string];
}

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function mapListingRow(
  row: RawListingRow,
  buyerCurrency: string,
  rates: Record<string, number>
): ListingDisplay {
  const seller = row.seller_profiles;
  const country = seller.african_countries;
  const priceLocal = Number(row.price_local);
  const buyerPriceValue = convertCurrency(
    priceLocal,
    row.price_currency_code,
    buyerCurrency,
    rates
  );
  const buyerSymbol = getCurrencySymbol(buyerCurrency);
  const sellerSymbol = country.currency_symbol || getCurrencySymbol(row.price_currency_code);
  const [accentFrom, accentTo] = accentForId(row.id);

  return {
    id: row.id,
    sellerId: seller.id,
    productName: row.product_name,
    farmName: seller.farm_name,
    category: row.category,
    countryName: country.name,
    stateRegion: seller.state_region,
    country: `${seller.state_region}, ${country.name}`,
    flag: country.flag_emoji,
    buyerPrice: `${formatMoney(buyerPriceValue, buyerCurrency, buyerSymbol)}/${row.unit}`,
    buyerPriceValue,
    sellerPrice: `≈ ${formatMoney(priceLocal, row.price_currency_code, sellerSymbol)}/${row.unit}`,
    sellerCurrencyCode: row.price_currency_code,
    sellerPriceValue: priceLocal,
    minOrder: `Min: ${row.min_order_quantity} ${row.min_order_unit}`,
    minOrderValue: Number(row.min_order_quantity),
    stockStatus: row.stock_status,
    rating: Number(seller.average_rating) || 0,
    verifiedSeller: seller.is_verified,
    seasonalMonths: normalizeSeasonalMonths(row.seasonal_months),
    createdAt: row.created_at,
    photoUrl: row.photo_url,
    accentFrom,
    accentTo
  };
}

function toFeatured(listing: ListingDisplay): FeaturedListingDisplay {
  return {
    tag: "Featured seller",
    productName: listing.productName,
    farmName: listing.farmName,
    country: listing.country,
    flag: listing.flag,
    buyerPrice: listing.buyerPrice,
    sellerPrice: listing.sellerPrice,
    seasonalMonths: listing.seasonalMonths,
    sellerId: listing.sellerId ?? listing.id
  };
}

async function fetchRawListings(options: {
  limit?: number;
  featuredOnly?: boolean;
  search?: string;
  countryId?: string;
  category?: string;
  verifiedOnly?: boolean;
  sortBy?: BrowseListingsParams["sortBy"];
}): Promise<RawListingRow[]> {
  const supabase = createClient();
  let query = supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("is_active", true);

  if (options.featuredOnly) {
    query = query.eq("is_featured", true).gt("featured_until", new Date().toISOString());
  }

  if (options.search?.trim()) {
    query = query.ilike("product_name", `%${options.search.trim()}%`);
  }

  if (options.category) {
    query = query.eq("category", options.category);
  }

  if (options.sortBy !== "highest_rated") {
    query = query.order("created_at", { ascending: false });
  }

  if (options.limit) {
    query = query.limit(options.limit * 3);
  }

  const { data, error } = await query;
  if (error) {
    console.error("listings fetch error:", error.message);
    return [];
  }

  let rows = (data ?? []) as unknown as RawListingRow[];

  if (options.countryId) {
    rows = rows.filter(
      (row) => row.seller_profiles.african_countries.id === options.countryId
    );
  }

  if (options.verifiedOnly) {
    rows = rows.filter((row) => row.seller_profiles.is_verified);
  }

  if (options.sortBy === "highest_rated") {
    rows.sort(
      (a, b) =>
        Number(b.seller_profiles.average_rating) - Number(a.seller_profiles.average_rating)
    );
  } else {
    rows.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  if (options.limit) {
    rows = rows.slice(0, options.limit);
  }

  return rows;
}

export async function fetchListingsForBrowse(
  params: BrowseListingsParams,
  buyerCurrency?: string
): Promise<ListingDisplay[]> {
  const currency = buyerCurrency ?? (await getBuyerCurrency());
  const rates = await getExchangeRates();

  const rows = await fetchRawListings({
    search: params.search,
    countryId: params.countryId,
    category: params.category,
    verifiedOnly: params.verifiedOnly,
    sortBy: params.sortBy === "highest_rated" ? "highest_rated" : "newest",
    limit: params.limit ?? 20
  });

  let listings = rows.map((row) => mapListingRow(row, currency, rates));

  if (params.maxPriceGbp !== undefined && params.maxPriceGbp < 50) {
    listings = listings.filter(
      (listing) =>
        convertCurrency(listing.buyerPriceValue, currency, "GBP", rates) <= params.maxPriceGbp!
    );
  }

  if (params.minOrder !== undefined && params.minOrder > 1) {
    listings = listings.filter((listing) => listing.minOrderValue >= params.minOrder!);
  }

  if (params.sortBy === "price_low_high") {
    listings.sort((a, b) => a.buyerPriceValue - b.buyerPriceValue);
  } else if (params.sortBy === "price_high_low") {
    listings.sort((a, b) => b.buyerPriceValue - a.buyerPriceValue);
  }

  return listings.slice(0, params.limit ?? 20);
}

export async function fetchHomeListings(limit = 8): Promise<ListingDisplay[]> {
  const buyerCurrency = await getBuyerCurrency();
  const rates = await getExchangeRates();
  const rows = await fetchRawListings({ limit });
  return rows.map((row) => mapListingRow(row, buyerCurrency, rates));
}

export async function fetchFeaturedListing(): Promise<FeaturedListingDisplay | null> {
  const buyerCurrency = await getBuyerCurrency();
  const rates = await getExchangeRates();

  let rows = await fetchRawListings({ featuredOnly: true, limit: 1 });
  if (!rows.length) {
    rows = await fetchRawListings({ limit: 1 });
  }
  if (!rows.length) return null;

  return toFeatured(mapListingRow(rows[0], buyerCurrency, rates));
}

export async function fetchHomeStats(): Promise<HomeStatsDisplay> {
  const supabase = createClient();

  const [sellersResult, productsResult] = await Promise.all([
    supabase
      .from("seller_profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_verified", true),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
  ]);

  return {
    activeSellers: sellersResult.count ?? 0,
    products: productsResult.count ?? 0
  };
}

export async function fetchTopVerifiedSellers(limit = 5): Promise<VerifiedSellerCard[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("seller_profiles")
    .select(
      `
      id,
      farm_name,
      state_region,
      average_rating,
      african_countries!inner ( name, flag_emoji )
    `
    )
    .eq("is_verified", true)
    .order("average_rating", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  const borderColors = ["#1D9E75", "#F5C442", "#5DCAA5", "#FAC775", "#9FE1CB"];

  return data.map((row, index) => {
    const country = unwrapRelation(row.african_countries as { name: string; flag_emoji: string } | { name: string; flag_emoji: string }[]);
    if (!country) return null;
    return {
      id: row.id as string,
      initials: getInitials(row.farm_name as string),
      farmName: row.farm_name as string,
      countryState: `${country.flag_emoji} ${country.name}, ${row.state_region}`,
      rating: Number(row.average_rating) || 0,
      borderColor: borderColors[index % borderColors.length]
    };
  }).filter((seller): seller is VerifiedSellerCard => seller !== null);
}

export async function fetchCountrySellerClusters(): Promise<CountrySellerCluster[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("seller_profiles")
    .select(
      `
      id,
      african_countries!inner ( id, name, code, flag_emoji )
    `
    )
    .eq("is_verified", true);

  if (error || !data) return [];

  const counts = new Map<
    string,
    { countryCode: string; countryName: string; flag: string; sellers: number }
  >();

  for (const row of data) {
    const country = unwrapRelation(
      row.african_countries as
        | { name: string; code: string; flag_emoji: string }
        | { name: string; code: string; flag_emoji: string }[]
    );
    if (!country) continue;
    const existing = counts.get(country.code);
    if (existing) {
      existing.sellers += 1;
    } else {
      counts.set(country.code, {
        countryCode: country.code,
        countryName: country.name,
        flag: country.flag_emoji,
        sellers: 1
      });
    }
  }

  return Array.from(counts.values())
    .map((cluster) => {
      const coords = COUNTRY_COORDINATES[cluster.countryCode];
      if (!coords) return null;
      return {
        ...cluster,
        lat: coords.lat,
        lng: coords.lng
      };
    })
    .filter((cluster): cluster is CountrySellerCluster => cluster !== null);
}

export async function resolveCountryIdByName(countryName: string): Promise<string | null> {
  if (!countryName) return null;
  const supabase = createClient();
  const { data } = await supabase
    .from("african_countries")
    .select("id")
    .eq("name", countryName)
    .maybeSingle();
  return data?.id ?? null;
}

export async function fetchHomePageData() {
  const [listings, featured, stats, topVerifiedSellers] = await Promise.all([
    fetchHomeListings(8),
    fetchFeaturedListing(),
    fetchHomeStats(),
    fetchTopVerifiedSellers(5)
  ]);

  return { listings, featured, stats, topVerifiedSellers };
}

export async function fetchAfricanCountriesForBrowse() {
  const supabase = createClient();
  const { data } = await supabase
    .from("african_countries")
    .select("id, name, code, flag_emoji")
    .order("name");
  return data ?? [];
}
