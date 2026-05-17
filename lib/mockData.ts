export type StockStatus = "in_season" | "bulk_available" | "low_stock" | "new_listing";

export interface ListingMock {
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
  enquiriesCount: number;
  rating: number;
  verifiedSeller: boolean;
  seasonalMonths?: number[];
  createdAt: string;
  accentFrom: string;
  accentTo: string;
}

export interface SellerReviewMock {
  id: string;
  buyerName: string;
  buyerFlag: string;
  buyerCountry: string;
  rating: number;
  dateLabel: string;
  comment: string;
  confirmedPurchase: boolean;
}

export interface SellerProfileMock {
  id: string;
  farmName: string;
  country: string;
  flag: string;
  state: string;
  localArea: string;
  isVerified: boolean;
  verifiedAt: string;
  rating: number;
  totalReviews: number;
  memberSince: string;
  description: string;
  whatsapp: string;
  established: string;
  speciality: string;
  minOrders: string;
}

export interface SellerMock {
  id: string;
  initials: string;
  farmName: string;
  countryState: string;
  rating: number;
  borderColor: string;
}

export interface AfricanCountryMock {
  code: string;
  name: string;
  flag: string;
  /** E.g. "+234" — shown read-only on WhatsApp step */
  phoneCode: string;
  states: string[];
}

/** Top 15 agricultural markets — same order as seeded reference data */
export const sellerOnboardingCountries: AfricanCountryMock[] = [
  { code: "NG", name: "Nigeria", flag: "🇳🇬", phoneCode: "+234", states: ["Lagos", "Kano", "Kaduna", "Rivers", "Oyo", "Anambra"] },
  { code: "GH", name: "Ghana", flag: "🇬🇭", phoneCode: "+233", states: ["Greater Accra", "Ashanti", "Northern", "Western", "Eastern", "Volta"] },
  { code: "KE", name: "Kenya", flag: "🇰🇪", phoneCode: "+254", states: ["Nairobi", "Mombasa", "Nakuru", "Kiambu", "Kisumu", "Kericho"] },
  { code: "ET", name: "Ethiopia", flag: "🇪🇹", phoneCode: "+251", states: ["Addis Ababa", "Oromia", "Amhara", "Tigray", "Sidama"] },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", phoneCode: "+27", states: ["Gauteng", "Western Cape", "KwaZulu-Natal", "Limpopo", "Eastern Cape"] },
  { code: "TZ", name: "Tanzania", flag: "🇹🇿", phoneCode: "+255", states: ["Dar es Salaam", "Arusha", "Dodoma", "Mwanza", "Mbeya"] },
  { code: "UG", name: "Uganda", flag: "🇺🇬", phoneCode: "+256", states: ["Kampala", "Wakiso", "Gulu", "Mbarara", "Jinja"] },
  { code: "CI", name: "Ivory Coast", flag: "🇨🇮", phoneCode: "+225", states: ["Abidjan", "Yamoussoukro", "Bouake", "San-Pedro", "Korhogo"] },
  { code: "CM", name: "Cameroon", flag: "🇨🇲", phoneCode: "+237", states: ["Littoral", "Centre", "West", "Northwest", "Southwest"] },
  { code: "SN", name: "Senegal", flag: "🇸🇳", phoneCode: "+221", states: ["Dakar", "Thies", "Saint-Louis", "Kaolack", "Ziguinchor"] },
  { code: "MZ", name: "Mozambique", flag: "🇲🇿", phoneCode: "+258", states: ["Maputo", "Sofala", "Nampula", "Zambezia", "Tete"] },
  { code: "ZM", name: "Zambia", flag: "🇿🇲", phoneCode: "+260", states: ["Lusaka", "Copperbelt", "Southern", "Central", "Eastern"] },
  { code: "ZW", name: "Zimbabwe", flag: "🇿🇼", phoneCode: "+263", states: ["Harare", "Bulawayo", "Manicaland", "Midlands", "Masvingo"] },
  { code: "MW", name: "Malawi", flag: "🇲🇼", phoneCode: "+265", states: ["Lilongwe", "Blantyre", "Mzuzu", "Zomba", "Kasungu"] },
  { code: "RW", name: "Rwanda", flag: "🇷🇼", phoneCode: "+250", states: ["Kigali", "Northern", "Southern", "Eastern", "Western"] }
];

export interface SellerVerificationChoice {
  id: string;
  title: string;
  subtitle?: string;
}

export function getSellerVerificationChoices(countryCode: string): SellerVerificationChoice[] {
  switch (countryCode) {
    case "NG":
      return [
        { id: "nin", title: "NIN (National ID)", subtitle: "National Identification Number" },
        { id: "cac", title: "CAC Registration", subtitle: "Corporate Affairs Commission" }
      ];
    case "GH":
      return [
        { id: "tin", title: "TIN", subtitle: "Tax Identification Number" },
        { id: "rgd", title: "RGD Certificate", subtitle: "Registrar General's Department" }
      ];
    case "KE":
      return [
        { id: "kra_pin", title: "KRA PIN", subtitle: "Kenya Revenue Authority" },
        { id: "business_registration", title: "Business Registration", subtitle: "Business Registration Service" }
      ];
    default:
      return [
        {
          id: "business_document",
          title: "Business Registration Document",
          subtitle: "Official proof of registration"
        }
      ];
  }
}

export interface SellerLocationCluster {
  countryCode: string;
  countryName: string;
  flag: string;
  lat: number;
  lng: number;
  sellers: number;
}

export interface SellerLocationPoint {
  id: string;
  farmName: string;
  countryCode: string;
  countryName: string;
  flag: string;
  state: string;
  lat: number;
  lng: number;
  topProducts: string[];
  rating: number;
}

export const buyerLocation = {
  city: "London",
  currency: "GBP (£)",
  greeting: "Good morning",
  userName: "Emmanuel"
};

export const categoryChips = [
  "All",
  "Dried goods",
  "Grains",
  "Spices",
  "Seafood",
  "Oils",
  "Fresh",
  "Livestock",
  "Beverages",
  "Nuts & Seeds"
];

export const homeStats = {
  activeSellers: 842,
  products: 3180
};

export const featuredSeller = {
  tag: "Featured seller",
  productName: "Premium Red Palm Oil",
  farmName: "Orlu Heritage Farms",
  country: "Imo, Nigeria",
  flag: "🇳🇬",
  buyerPrice: "£12.80/L",
  sellerPrice: "≈ ₦24,500/L",
  seasonalMonths: [1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1]
};

export const listings: ListingMock[] = [
  {
    id: "1",
    sellerId: "seller-1",
    productName: "Bitter leaf",
    farmName: "Nnewi Greenline",
    category: "Fresh produce",
    countryName: "Nigeria",
    stateRegion: "Anambra",
    country: "Anambra, Nigeria",
    flag: "🇳🇬",
    buyerPrice: "£4.20/kg",
    buyerPriceValue: 4.2,
    sellerPrice: "≈ ₦7,200/kg",
    sellerCurrencyCode: "NGN",
    sellerPriceValue: 7200,
    minOrder: "Min: 8 kg",
    minOrderValue: 8,
    stockStatus: "in_season",
    enquiriesCount: 38,
    rating: 4.8,
    verifiedSeller: true,
    seasonalMonths: [1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1],
    createdAt: "2026-05-04T10:00:00.000Z",
    accentFrom: "#154735",
    accentTo: "#1D9E75"
  },
  {
    id: "2",
    sellerId: "seller-1",
    productName: "Palm oil (red)",
    farmName: "Orlu Heritage",
    category: "Oils",
    countryName: "Nigeria",
    stateRegion: "Imo",
    country: "Imo, Nigeria",
    flag: "🇳🇬",
    buyerPrice: "£12.80/L",
    buyerPriceValue: 12.8,
    sellerPrice: "≈ ₦24,500/L",
    sellerCurrencyCode: "NGN",
    sellerPriceValue: 24500,
    minOrder: "Min: 20 L",
    minOrderValue: 20,
    stockStatus: "bulk_available",
    enquiriesCount: 55,
    rating: 4.9,
    verifiedSeller: true,
    seasonalMonths: [1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1],
    createdAt: "2026-05-03T08:00:00.000Z",
    accentFrom: "#5e1a12",
    accentTo: "#b43f2a"
  },
  {
    id: "3",
    sellerId: "seller-1",
    productName: "Ofada rice",
    farmName: "Abeokuta Grain Co.",
    category: "Grains",
    countryName: "Nigeria",
    stateRegion: "Ogun",
    country: "Ogun, Nigeria",
    flag: "🇳🇬",
    buyerPrice: "£6.95/kg",
    buyerPriceValue: 6.95,
    sellerPrice: "≈ ₦12,300/kg",
    sellerCurrencyCode: "NGN",
    sellerPriceValue: 12300,
    minOrder: "Min: 15 kg",
    minOrderValue: 15,
    stockStatus: "new_listing",
    enquiriesCount: 21,
    rating: 4.6,
    verifiedSeller: false,
    seasonalMonths: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    createdAt: "2026-05-06T09:00:00.000Z",
    accentFrom: "#4e3814",
    accentTo: "#9e6f1d"
  },
  {
    id: "4",
    sellerId: "seller-1",
    productName: "Ogiri (locust bean)",
    farmName: "Nsukka Spice House",
    category: "Spices",
    countryName: "Nigeria",
    stateRegion: "Enugu",
    country: "Enugu, Nigeria",
    flag: "🇳🇬",
    buyerPrice: "£2.90/pack",
    buyerPriceValue: 2.9,
    sellerPrice: "≈ ₦4,900/pack",
    sellerCurrencyCode: "NGN",
    sellerPriceValue: 4900,
    minOrder: "Min: 25 packs",
    minOrderValue: 25,
    stockStatus: "low_stock",
    enquiriesCount: 31,
    rating: 4.5,
    verifiedSeller: true,
    seasonalMonths: [1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1],
    createdAt: "2026-05-01T12:00:00.000Z",
    accentFrom: "#2d1f0e",
    accentTo: "#7b4f17"
  },
  {
    id: "5",
    productName: "Cocoa butter",
    farmName: "Kumasi Cocoa Co.",
    category: "Oils",
    countryName: "Ghana",
    stateRegion: "Ashanti",
    country: "Ashanti, Ghana",
    flag: "🇬🇭",
    buyerPrice: "£8.95/kg",
    buyerPriceValue: 8.95,
    sellerPrice: "≈ GH₵180/kg",
    sellerCurrencyCode: "GHS",
    sellerPriceValue: 180,
    minOrder: "Min: 10 kg",
    minOrderValue: 10,
    stockStatus: "in_season",
    enquiriesCount: 49,
    rating: 4.8,
    verifiedSeller: true,
    createdAt: "2026-05-05T11:00:00.000Z",
    accentFrom: "#4b2a14",
    accentTo: "#7b4c2a"
  },
  {
    id: "6",
    productName: "Premium Kenyan tea",
    farmName: "Kericho Tea Estate",
    category: "Beverages",
    countryName: "Kenya",
    stateRegion: "Kericho",
    country: "Kericho, Kenya",
    flag: "🇰🇪",
    buyerPrice: "£5.30/kg",
    buyerPriceValue: 5.3,
    sellerPrice: "≈ KES 850/kg",
    sellerCurrencyCode: "KES",
    sellerPriceValue: 850,
    minOrder: "Min: 12 kg",
    minOrderValue: 12,
    stockStatus: "bulk_available",
    enquiriesCount: 44,
    rating: 4.7,
    verifiedSeller: true,
    createdAt: "2026-05-02T09:30:00.000Z",
    accentFrom: "#174128",
    accentTo: "#2f774b"
  },
  {
    id: "7",
    productName: "Teff grain (brown)",
    farmName: "Bahir Dar Grain Collective",
    category: "Grains",
    countryName: "Ethiopia",
    stateRegion: "Amhara",
    country: "Amhara, Ethiopia",
    flag: "🇪🇹",
    buyerPrice: "£3.40/kg",
    buyerPriceValue: 3.4,
    sellerPrice: "≈ ETB 120/kg",
    sellerCurrencyCode: "ETB",
    sellerPriceValue: 120,
    minOrder: "Min: 20 kg",
    minOrderValue: 20,
    stockStatus: "in_season",
    enquiriesCount: 39,
    rating: 4.9,
    verifiedSeller: false,
    createdAt: "2026-05-04T13:00:00.000Z",
    accentFrom: "#3e2e10",
    accentTo: "#86712d"
  },
  {
    id: "8",
    productName: "Rooibos tea (organic)",
    farmName: "Cape Herb Farm",
    category: "Beverages",
    countryName: "South Africa",
    stateRegion: "Western Cape",
    country: "Western Cape, South Africa",
    flag: "🇿🇦",
    buyerPrice: "£4.85/100g",
    buyerPriceValue: 4.85,
    sellerPrice: "≈ ZAR 95/100g",
    sellerCurrencyCode: "ZAR",
    sellerPriceValue: 95,
    minOrder: "Min: 30 packs",
    minOrderValue: 30,
    stockStatus: "new_listing",
    enquiriesCount: 16,
    rating: 4.6,
    verifiedSeller: true,
    createdAt: "2026-05-06T08:00:00.000Z",
    accentFrom: "#3c1f1f",
    accentTo: "#82483f"
  },
  {
    id: "9",
    productName: "Dried hibiscus (zobo)",
    farmName: "Kano Flower Farm",
    category: "Dried goods",
    countryName: "Nigeria",
    stateRegion: "Kano",
    country: "Kano, Nigeria",
    flag: "🇳🇬",
    buyerPrice: "£2.20/kg",
    buyerPriceValue: 2.2,
    sellerPrice: "≈ ₦3,500/kg",
    sellerCurrencyCode: "NGN",
    sellerPriceValue: 3500,
    minOrder: "Min: 18 kg",
    minOrderValue: 18,
    stockStatus: "in_season",
    enquiriesCount: 62,
    rating: 4.7,
    verifiedSeller: true,
    createdAt: "2026-05-05T07:00:00.000Z",
    accentFrom: "#4a1731",
    accentTo: "#8f2f57"
  },
  {
    id: "10",
    productName: "Shea butter (unrefined)",
    farmName: "Tamale Shea Women's Coop",
    category: "Oils",
    countryName: "Ghana",
    stateRegion: "Northern",
    country: "Northern, Ghana",
    flag: "🇬🇭",
    buyerPrice: "£7.10/kg",
    buyerPriceValue: 7.1,
    sellerPrice: "≈ GH₵140/kg",
    sellerCurrencyCode: "GHS",
    sellerPriceValue: 140,
    minOrder: "Min: 14 kg",
    minOrderValue: 14,
    stockStatus: "bulk_available",
    enquiriesCount: 40,
    rating: 4.8,
    verifiedSeller: true,
    createdAt: "2026-05-03T15:30:00.000Z",
    accentFrom: "#584224",
    accentTo: "#8f6d3a"
  },
  {
    id: "11",
    productName: "Dried moringa leaf",
    farmName: "Dodoma Greens",
    category: "Dried goods",
    countryName: "Tanzania",
    stateRegion: "Dodoma",
    country: "Dodoma, Tanzania",
    flag: "🇹🇿",
    buyerPrice: "£4.60/kg",
    buyerPriceValue: 4.6,
    sellerPrice: "≈ TZS 15,000/kg",
    sellerCurrencyCode: "TZS",
    sellerPriceValue: 15000,
    minOrder: "Min: 22 kg",
    minOrderValue: 22,
    stockStatus: "new_listing",
    enquiriesCount: 12,
    rating: 4.4,
    verifiedSeller: false,
    createdAt: "2026-05-06T06:40:00.000Z",
    accentFrom: "#1d3a2a",
    accentTo: "#2f6f57"
  },
  {
    id: "12",
    productName: "Ground coffee (Arabica)",
    farmName: "Sidama Coffee Union",
    category: "Beverages",
    countryName: "Ethiopia",
    stateRegion: "Sidama",
    country: "Sidama, Ethiopia",
    flag: "🇪🇹",
    buyerPrice: "£11.50/kg",
    buyerPriceValue: 11.5,
    sellerPrice: "≈ ETB 950/kg",
    sellerCurrencyCode: "ETB",
    sellerPriceValue: 950,
    minOrder: "Min: 9 kg",
    minOrderValue: 9,
    stockStatus: "in_season",
    enquiriesCount: 53,
    rating: 4.9,
    verifiedSeller: true,
    createdAt: "2026-05-02T13:30:00.000Z",
    accentFrom: "#2f2217",
    accentTo: "#634b32"
  }
];

export const topVerifiedSellers: SellerMock[] = [
  {
    id: "s1",
    initials: "AF",
    farmName: "Amina Foods",
    countryState: "Kaduna, Nigeria",
    rating: 4.9,
    borderColor: "#5DCAA5"
  },
  {
    id: "s2",
    initials: "KB",
    farmName: "Kumasi Bulk Exports",
    countryState: "Ashanti, Ghana",
    rating: 4.8,
    borderColor: "#FAC775"
  },
  {
    id: "s3",
    initials: "RN",
    farmName: "Rift Valley Naturals",
    countryState: "Nakuru, Kenya",
    rating: 4.7,
    borderColor: "#73b9ff"
  },
  {
    id: "s4",
    initials: "WB",
    farmName: "Western Cape Botanics",
    countryState: "Cape Town, South Africa",
    rating: 4.9,
    borderColor: "#d29cff"
  }
];

export const africanCountries: AfricanCountryMock[] = sellerOnboardingCountries.map((c) => ({ ...c }));

export const browseCategories = [
  "Dried goods",
  "Grains",
  "Spices",
  "Seafood",
  "Oils",
  "Fresh produce",
  "Livestock",
  "Beverages",
  "Nuts & Seeds",
  "Roots & Tubers"
];

export const sellerCountryClusters: SellerLocationCluster[] = [
  { countryCode: "NG", countryName: "Nigeria", flag: "🇳🇬", lat: 9.08, lng: 7.49, sellers: 84 },
  { countryCode: "GH", countryName: "Ghana", flag: "🇬🇭", lat: 7.95, lng: -1.02, sellers: 23 },
  { countryCode: "KE", countryName: "Kenya", flag: "🇰🇪", lat: -0.02, lng: 37.91, sellers: 15 },
  { countryCode: "ET", countryName: "Ethiopia", flag: "🇪🇹", lat: 9.15, lng: 40.49, sellers: 12 },
  { countryCode: "ZA", countryName: "South Africa", flag: "🇿🇦", lat: -30.56, lng: 22.94, sellers: 8 },
  { countryCode: "TZ", countryName: "Tanzania", flag: "🇹🇿", lat: -6.37, lng: 34.89, sellers: 6 }
];

export const sellerStateMarkers: SellerLocationPoint[] = [
  {
    id: "mk1",
    farmName: "Orlu Heritage Farms",
    countryCode: "NG",
    countryName: "Nigeria",
    flag: "🇳🇬",
    state: "Imo",
    lat: 5.485,
    lng: 7.035,
    topProducts: ["Palm oil", "Ogiri", "Bitter leaf"],
    rating: 4.9
  },
  {
    id: "mk2",
    farmName: "Kumasi Cocoa Co.",
    countryCode: "GH",
    countryName: "Ghana",
    flag: "🇬🇭",
    state: "Ashanti",
    lat: 6.688,
    lng: -1.624,
    topProducts: ["Cocoa butter", "Shea butter", "Dried hibiscus"],
    rating: 4.8
  },
  {
    id: "mk3",
    farmName: "Kericho Tea Estate",
    countryCode: "KE",
    countryName: "Kenya",
    flag: "🇰🇪",
    state: "Kericho",
    lat: -0.367,
    lng: 35.283,
    topProducts: ["Kenyan tea", "Black tea", "Green tea"],
    rating: 4.7
  },
  {
    id: "mk4",
    farmName: "Sidama Coffee Union",
    countryCode: "ET",
    countryName: "Ethiopia",
    flag: "🇪🇹",
    state: "Sidama",
    lat: 6.95,
    lng: 38.5,
    topProducts: ["Arabica coffee", "Teff", "Moringa leaf"],
    rating: 4.9
  },
  {
    id: "mk5",
    farmName: "Cape Herb Farm",
    countryCode: "ZA",
    countryName: "South Africa",
    flag: "🇿🇦",
    state: "Western Cape",
    lat: -33.92,
    lng: 18.42,
    topProducts: ["Rooibos tea", "Herbal blend", "Dried citrus"],
    rating: 4.6
  },
  {
    id: "mk6",
    farmName: "Dodoma Greens",
    countryCode: "TZ",
    countryName: "Tanzania",
    flag: "🇹🇿",
    state: "Dodoma",
    lat: -6.163,
    lng: 35.751,
    topProducts: ["Moringa leaf", "Sesame", "Sunflower seeds"],
    rating: 4.4
  }
];

export const sellerProfileMock: SellerProfileMock = {
  id: "seller-1",
  farmName: "Adewale Heritage Farms",
  country: "Nigeria",
  flag: "🇳🇬",
  state: "Ogun State",
  localArea: "Abeokuta North",
  isVerified: true,
  verifiedAt: "2026-01-15",
  rating: 4.9,
  totalReviews: 24,
  memberSince: "2025-03-01",
  description:
    "Family-run farm in Ogun State, Nigeria. We've been growing and processing ogiri and locust bean for over 15 years. All our produce is naturally processed with no artificial preservatives.",
  whatsapp: "+2348012345678",
  established: "2011",
  speciality: "Spices & dried goods",
  minOrders: "From 5kg"
};

export const sellerReviewsMock: SellerReviewMock[] = [
  {
    id: "r-1",
    buyerName: "Chioma A.",
    buyerFlag: "🇬🇧",
    buyerCountry: "UK",
    rating: 5,
    dateLabel: "2 weeks ago",
    comment:
      "Excellent quality ogiri. Arrived well packaged and the flavour is authentic. Will definitely order again.",
    confirmedPurchase: true
  },
  {
    id: "r-2",
    buyerName: "David O.",
    buyerFlag: "🇺🇸",
    buyerCountry: "US",
    rating: 5,
    dateLabel: "1 month ago",
    comment:
      "Best locust bean I've found outside Nigeria. Adewale was very responsive on WhatsApp and helped arrange shipping.",
    confirmedPurchase: true
  },
  {
    id: "r-3",
    buyerName: "Funke B.",
    buyerFlag: "🇬🇧",
    buyerCountry: "UK",
    rating: 4,
    dateLabel: "2 months ago",
    comment:
      "Good quality produce. Shipping took a bit longer than expected but the product itself was great.",
    confirmedPurchase: false
  },
  {
    id: "r-4",
    buyerName: "James K.",
    buyerFlag: "🇦🇺",
    buyerCountry: "AU",
    rating: 5,
    dateLabel: "3 months ago",
    comment:
      "Running an African restaurant in Melbourne and Adewale's farm has become our go-to supplier. Consistent quality every time.",
    confirmedPurchase: true
  }
];
