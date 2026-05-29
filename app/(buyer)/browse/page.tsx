"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, List, Map, Search, SlidersHorizontal } from "lucide-react";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { DarkSelect } from "@/components/ui/DarkSelect";
import { ListingCard } from "@/components/ui/ListingCard";
import { africanCountries, browseCategories, listings } from "@/lib/mockData";
import { useTheme } from "@/components/layout/ThemeProvider";

const BrowseMap = dynamic(() => import("@/components/ui/BrowseMap"), { ssr: false });

type SortKey =
  | "newest"
  | "most_enquired"
  | "highest_rated"
  | "price_low_high"
  | "price_high_low";

const sortPills: Array<{ key: SortKey; label: string }> = [
  { key: "newest", label: "Newest" },
  { key: "most_enquired", label: "Most enquired" },
  { key: "highest_rated", label: "Highest rated" },
  { key: "price_low_high", label: "Price: low-high" },
  { key: "price_high_low", label: "Price: high-low" }
];

function BrowsePageContent() {
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const [isMapView, setIsMapView] = useState(false);
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("newest");

  const [selectedCountry, setSelectedCountry] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState(50);
  const [minOrder, setMinOrder] = useState(1);

  useEffect(() => {
    const category = searchParams.get("category");
    const q = searchParams.get("q");
    if (category) setSelectedCategory(category);
    if (q) setQuery(q);
    if (searchParams.get("filters") === "open") setFiltersOpen(true);
  }, [searchParams]);

  const activeFilterCount = [
    selectedCountry,
    selectedState,
    selectedCategory,
    verifiedOnly ? "verified" : "",
    maxPrice < 50 ? "price" : "",
    minOrder > 1 ? "min-order" : ""
  ].filter(Boolean).length;

  const filteredCountries = useMemo(() => {
    const cleaned = countrySearch.trim().toLowerCase();
    if (!cleaned) return africanCountries;
    return africanCountries.filter((country) =>
      country.name.toLowerCase().includes(cleaned)
    );
  }, [countrySearch]);

  const stateOptions = useMemo(() => {
    const country = africanCountries.find((item) => item.name === selectedCountry);
    return country?.states ?? [];
  }, [selectedCountry]);

  const filteredListings = useMemo(() => {
    let data = [...listings];
    const cleanedQuery = query.trim().toLowerCase();
    if (cleanedQuery) {
      data = data.filter(
        (listing) =>
          listing.productName.toLowerCase().includes(cleanedQuery) ||
          listing.farmName.toLowerCase().includes(cleanedQuery) ||
          listing.country.toLowerCase().includes(cleanedQuery) ||
          listing.countryName.toLowerCase().includes(cleanedQuery)
      );
    }

    if (selectedCountry) {
      data = data.filter((listing) => listing.countryName === selectedCountry);
    }
    if (selectedState) {
      data = data.filter((listing) => listing.stateRegion === selectedState);
    }
    if (selectedCategory) {
      data = data.filter((listing) => listing.category === selectedCategory);
    }
    if (verifiedOnly) {
      data = data.filter((listing) => listing.verifiedSeller);
    }
    data = data.filter((listing) => listing.buyerPriceValue <= maxPrice);
    data = data.filter((listing) => listing.minOrderValue >= minOrder);

    data.sort((a, b) => {
      if (sortBy === "newest") return Date.parse(b.createdAt) - Date.parse(a.createdAt);
      if (sortBy === "most_enquired") return b.enquiriesCount - a.enquiriesCount;
      if (sortBy === "highest_rated") return b.rating - a.rating;
      if (sortBy === "price_low_high") return a.buyerPriceValue - b.buyerPriceValue;
      return b.buyerPriceValue - a.buyerPriceValue;
    });

    return data.slice(0, 8);
  }, [
    maxPrice,
    minOrder,
    query,
    selectedCategory,
    selectedCountry,
    selectedState,
    sortBy,
    verifiedOnly
  ]);

  const clearAllFilters = () => {
    setSelectedCountry("");
    setCountrySearch("");
    setSelectedState("");
    setSelectedCategory("");
    setVerifiedOnly(false);
    setMaxPrice(50);
    setMinOrder(1);
  };

  const onCountryChange = (country: string) => {
    setSelectedCountry(country);
    setSelectedState("");
  };

  const countrySelectOptions = useMemo(
    () => [
      { value: "", label: "All countries" },
      ...filteredCountries.map((country) => ({
        value: country.name,
        label: `${country.flag} ${country.name}`
      }))
    ],
    [filteredCountries]
  );

  const stateSelectOptions = useMemo(
    () => [
      { value: "", label: "All states / regions" },
      ...stateOptions.map((state) => ({ value: state, label: state }))
    ],
    [stateOptions]
  );

  const categorySelectOptions = useMemo(
    () => [
      { value: "", label: "All categories" },
      ...browseCategories.map((category) => ({ value: category, label: category }))
    ],
    []
  );

  const minOrderOptions = useMemo(
    () =>
      [1, 5, 10, 15, 20, 25, 30].map((value) => ({
        value: String(value),
        label: `${value}+`
      })),
    []
  );

  const priceSliderStyle = {
    "--eden-range-fill": `${(maxPrice / 50) * 100}%`
  } as CSSProperties;

  return (
    <main className="app-shell font-body mx-auto min-h-screen w-full max-w-md overflow-x-hidden pb-24 antialiased no-scrollbar">
      <section className="sticky top-0 z-20 border-b-[0.5px] border-[var(--card-border)] bg-[var(--glass-bg)] px-4 pb-3 pt-4 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="glass-card flex h-9 w-9 items-center justify-center rounded-full text-white"
              aria-label="Back to home"
            >
              <ArrowLeft size={16} />
            </Link>
            <h1 className={`eden-section-title ${theme === "dark" ? "text-white" : "text-[#1A1A18]"}`}>Browse produce</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setIsMapView((prev) => !prev)}
              className="glass-card flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-primary)]"
              aria-label="Toggle map view"
            >
              {isMapView ? <List size={16} /> : <Map size={16} />}
            </button>
          </div>
        </div>

        <div className="glass-card themed-search mt-3 flex items-center gap-2 rounded-[16px] px-3 py-2.5">
          <Search size={16} className="shrink-0 text-[var(--text-tertiary)]" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
            autoCorrect="off"
            enterKeyHint="search"
            className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[#9C9C95] focus:outline-none"
            placeholder="Search by product, farm, or country..."
          />
          <button
            type="button"
            onClick={() => setFiltersOpen((prev) => !prev)}
            className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#1D9E75] px-2.5 py-1.5 text-xs font-medium text-white shadow-[0_6px_16px_rgba(29,158,117,0.35)]"
          >
            <SlidersHorizontal size={13} />
            Filters
            <span className="rounded-full bg-black/25 px-1.5 py-0.5 text-[10px] text-white">
              {activeFilterCount}
            </span>
          </button>
        </div>

        <div
          className={`transition-all duration-300 ease-out ${
            filtersOpen ? "max-h-[760px] opacity-100" : "max-h-0 opacity-0"
          } overflow-hidden`}
        >
          <div className="glass-card mt-3 space-y-3 p-3">
            <div>
              <p className={`mb-1.5 text-[11px] ${theme === "dark" ? "text-white/70" : "text-[#444441]"}`}>African country</p>
              <input
                value={countrySearch}
                onChange={(event) => setCountrySearch(event.target.value)}
                className="mb-2 w-full rounded-xl border-[0.5px] border-white/12 bg-[rgba(8,16,8,0.65)] px-3 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-[#1D9E75]/45"
                placeholder="Search country..."
              />
              <DarkSelect
                value={selectedCountry}
                options={countrySelectOptions}
                onChange={onCountryChange}
                placeholder="Choose country"
              />
            </div>

            <div>
              <p className={`mb-1.5 text-[11px] ${theme === "dark" ? "text-white/70" : "text-[#444441]"}`}>State/region</p>
              <DarkSelect
                value={selectedState}
                options={stateSelectOptions}
                onChange={setSelectedState}
                placeholder="Choose state or region"
                disabled={!selectedCountry}
              />
            </div>

            <div>
              <p className={`mb-1.5 text-[11px] ${theme === "dark" ? "text-white/70" : "text-[#444441]"}`}>Category</p>
              <DarkSelect
                value={selectedCategory}
                options={categorySelectOptions}
                onChange={setSelectedCategory}
                placeholder="Choose category"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border-[0.5px] border-white/10 bg-[rgba(8,16,8,0.5)] px-3 py-2.5">
              <span className="text-xs text-white/85">Verified sellers only</span>
              <button
                type="button"
                role="switch"
                aria-checked={verifiedOnly}
                onClick={() => setVerifiedOnly((prev) => !prev)}
                className={`relative h-7 w-12 rounded-full transition ${
                  verifiedOnly ? "bg-[#1D9E75]" : "bg-white/15"
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition ${
                    verifiedOnly ? "left-[26px]" : "left-1"
                  }`}
                />
              </button>
            </div>

            <div>
              <p className={`mb-1 text-[11px] ${theme === "dark" ? "text-white/70" : "text-[#444441]"}`}>
                Price range (GBP): £0 – £{maxPrice}
              </p>
              <input
                type="range"
                min={0}
                max={50}
                value={maxPrice}
                onChange={(event) => setMaxPrice(Number(event.target.value))}
                className="eden-range"
                style={priceSliderStyle}
              />
            </div>

            <div>
              <p className={`mb-1.5 text-[11px] ${theme === "dark" ? "text-white/70" : "text-[#444441]"}`}>Min order (kg/units)</p>
              <DarkSelect
                value={String(minOrder)}
                options={minOrderOptions}
                onChange={(value) => setMinOrder(Number(value))}
                placeholder="Minimum order"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="rounded-xl bg-[#1D9E75] px-5 py-2.5 text-xs font-semibold text-white shadow-[0_8px_22px_rgba(29,158,117,0.38)]"
              >
                Apply filters
              </button>
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs font-medium text-white/65 underline-offset-2 hover:text-white/85 hover:underline"
              >
                Clear all
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pt-3">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {sortPills.map((pill) => (
            <button
              type="button"
              key={pill.key}
              onClick={() => setSortBy(pill.key)}
              className={`eden-category-chip whitespace-nowrap rounded-full border-[0.5px] px-3 py-1.5 transition ${
                sortBy === pill.key
                  ? "border-[#1D9E75] bg-[#1D9E75] text-white shadow-[0_6px_16px_rgba(29,158,117,0.35)]"
                  : "border-white/12 bg-[rgba(10,20,10,0.88)] text-white/78 shadow-[0_4px_14px_rgba(0,0,0,0.28)]"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </section>

      {!isMapView ? (
        <section className="px-4 pb-4 pt-3">
          <div className="grid grid-cols-2 gap-3">
            {filteredListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
          {filteredListings.length === 0 && (
            <div className="glass-card mt-4 p-4 text-center text-sm text-[var(--text-secondary)]">
              No listings match your current filters.
            </div>
          )}
        </section>
      ) : (
        <section className="px-4 pb-4 pt-3">
          <BrowseMap
            selectedCountryCode={
              africanCountries.find((country) => country.name === selectedCountry)?.code ?? ""
            }
          />
        </section>
      )}

      <MobileBottomNav active="browse" />
    </main>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={null}>
      <BrowsePageContent />
    </Suspense>
  );
}
