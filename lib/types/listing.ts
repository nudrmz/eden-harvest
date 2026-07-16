export type StockStatus =
  | "in_season"
  | "bulk_available"
  | "low_stock"
  | "out_of_stock"
  | "new_listing";

export interface ListingDisplay {
  id: string;
  sellerId?: string;
  productName: string;
  farmName: string;
  category: string;
  countryName: string;
  stateRegion: string;
  country: string;
  flag: string;
  buyerPrice: string;
  buyerPriceValue: number;
  sellerPrice: string;
  sellerCurrencyCode: string;
  sellerPriceValue: number;
  minOrder: string;
  minOrderValue: number;
  stockStatus: StockStatus;
  rating: number;
  verifiedSeller: boolean;
  seasonalMonths: number[];
  createdAt: string;
  photoUrl?: string | null;
  accentFrom: string;
  accentTo: string;
}

export interface FeaturedListingDisplay {
  tag: string;
  productName: string;
  farmName: string;
  country: string;
  flag: string;
  buyerPrice: string;
  sellerPrice: string;
  seasonalMonths: number[];
  sellerId: string;
  listingId: string;
}

export interface HomeStatsDisplay {
  activeSellers: number;
  products: number;
}

export interface CountrySellerCluster {
  countryCode: string;
  countryName: string;
  flag: string;
  lat: number;
  lng: number;
  sellers: number;
}

export interface VerifiedSellerCard {
  id: string;
  initials: string;
  farmName: string;
  countryState: string;
  rating: number;
  borderColor: string;
}
