"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useTheme } from "@/components/layout/ThemeProvider";
import { useAuth } from "@/lib/supabase/hooks";
import type { ListingMock } from "@/lib/mockData";
import type { ListingDisplay } from "@/lib/types/listing";

const statusLabels: Record<string, string> = {
  in_season: "In season",
  bulk_available: "Bulk avail.",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
  new_listing: "New listing"
};

function ProductGlyph() {
  return (
    <svg viewBox="0 0 180 90" className="h-full w-full opacity-95">
      <path
        d="M0 72 C32 42, 62 78, 92 58 C124 36, 145 68, 180 48 L180 90 L0 90 Z"
        fill="rgba(255,255,255,0.18)"
      />
      <circle cx="38" cy="46" r="12" fill="rgba(245,196,66,0.55)" />
      <path
        d="M84 24 C96 8, 122 8, 132 24 C138 34, 138 47, 126 56 C112 66, 100 66, 88 54 C80 46, 78 35, 84 24 Z"
        fill="rgba(255,255,255,0.16)"
      />
    </svg>
  );
}

interface ListingCardProps {
  listing: ListingDisplay | ListingMock;
  showSeasonBar?: boolean;
}

export function ListingCard({ listing, showSeasonBar = false }: ListingCardProps) {
  const { theme } = useTheme();
  const { isVerifiedAccess } = useAuth();
  const statusStyles: Record<string, string> =
    theme === "dark"
      ? {
          in_season: "bg-[#5DCAA533] text-[#5DCAA5]",
          bulk_available: "bg-[#FAC77533] text-[#FAC775]",
          low_stock: "bg-[#F0959533] text-[#F09595]",
          new_listing: "bg-[#5DCAA533] text-[#8ae4c0]",
          out_of_stock: "bg-[#ffffff22] text-white/60"
        }
      : {
          in_season: "bg-[#EAF3DE] text-[#27500A]",
          bulk_available: "bg-[#FAEEDA] text-[#633806]",
          low_stock: "bg-[#FCEBEB] text-[#791F1F]",
          new_listing: "bg-[#EAF3DE] text-[#27500A]",
          out_of_stock: "bg-[#F0EDE6] text-[#6B6B66]"
        };

  const photoUrl = "photoUrl" in listing ? listing.photoUrl : null;

  return (
    <article className={`overflow-hidden rounded-2xl border ${theme === "dark" ? "border-white/10 bg-[#112112]" : "border-[rgba(0,0,0,0.06)] bg-white shadow-sm"}`}>
      <div
        className="relative h-[110px] overflow-hidden p-2"
        style={{
          background: photoUrl
            ? undefined
            : `linear-gradient(135deg, ${listing.accentFrom}, ${listing.accentTo})`
        }}
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={listing.productName}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <span
          className={`absolute left-2 top-2 rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-wide ${statusStyles[listing.stockStatus]}`}
        >
          {statusLabels[listing.stockStatus]}
        </span>
        <button
          type="button"
          className="absolute right-2 top-2 rounded-full bg-black/20 p-1.5 text-white/80"
          aria-label="Save listing"
        >
          <Heart size={12} />
        </button>
        <div className="absolute bottom-0 left-0 right-0 h-[70px]">
          {!photoUrl ? <ProductGlyph /> : null}
        </div>
      </div>
      <div className="space-y-1 p-2.5">
        <p className={`eden-listing-product ${theme === "dark" ? "text-white" : "text-[#1A1A18]"}`}>{listing.productName}</p>
        <p className={`eden-listing-farm ${theme === "dark" ? "text-white/60" : "text-[#444441]"}`}>
          <Link href={`/seller/${listing.sellerId ?? listing.id}`} className="underline-offset-2 hover:underline">
            {listing.farmName}
          </Link>{" "}
          - {listing.flag} {listing.country}
        </p>
        <Link
          href={`/seller/${listing.sellerId ?? listing.id}`}
          className={`inline-block text-[10px] underline-offset-2 hover:underline ${theme === "dark" ? "text-eden-gold/90" : "text-[#1D9E75]"}`}
        >
          View profile
        </Link>
        <p className={`eden-price ${theme === "dark" ? "text-[#5DCAA5]" : "text-[#1D9E75]"}`}>{listing.buyerPrice}</p>
        <p className={`text-[10px] ${theme === "dark" ? "text-white/40" : "text-[#9C9C95]"}`}>{listing.sellerPrice}</p>
        <p className={`text-[10px] ${theme === "dark" ? "text-white/55" : "text-[#9C9C95]"}`}>{listing.minOrder}</p>
        {showSeasonBar ? (
          <div className="flex gap-1 pt-0.5">
            {(listing.seasonalMonths ?? Array(12).fill(0)).map((month, index) => (
              <span
                key={`${listing.id}-month-${index}`}
                className={`h-1.5 w-3 rounded-full ${month ? "bg-eden-gold" : "bg-white/15"}`}
              />
            ))}
          </div>
        ) : null}
        {isVerifiedAccess ? (
          <button
            type="button"
            className={`w-full rounded-lg py-1.5 text-[10px] font-medium ${
              theme === "dark"
                ? "border border-[#2faf7e99] bg-[#25D3661f] text-[#6BE79E]"
                : "border border-[#1D9E75] bg-[#1D9E75] text-white"
            }`}
          >
            Contact on WhatsApp
          </button>
        ) : (
          <Link
            href="/upgrade"
            className={`block w-full rounded-lg py-1.5 text-center text-[10px] font-medium ${
              theme === "dark"
                ? "border border-[#2faf7e99] bg-[#25D3661f] text-[#6BE79E]"
                : "border border-[#1D9E75] bg-transparent text-[#1D9E75]"
            }`}
          >
            Upgrade to contact
          </Link>
        )}
      </div>
    </article>
  );
}
