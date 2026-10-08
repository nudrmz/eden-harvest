"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fetchSellerProfileByUserId } from "@/lib/auth/seller";
import type { StockStatus } from "@/lib/types/listing";
import {
  ListingForm,
  type ListingFormValues,
  type ListingSavePayload
} from "@/components/seller/ListingForm";

interface ListingRow {
  id: string;
  seller_id: string;
  product_name: string;
  category: string;
  description: string | null;
  price_local: number;
  price_currency_code: string;
  unit: string;
  min_order_quantity: number | null;
  min_order_unit: string | null;
  photo_url: string | null;
  stock_status: StockStatus;
  is_active: boolean;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; listing: ListingRow };

function toFormValues(l: ListingRow): ListingFormValues {
  return {
    product_name: l.product_name,
    category: l.category,
    price_local: String(l.price_local ?? ""),
    price_currency_code: l.price_currency_code,
    unit: l.unit,
    min_order_quantity: l.min_order_quantity != null ? String(l.min_order_quantity) : "",
    min_order_unit: l.min_order_unit ?? l.unit,
    description: l.description ?? "",
    stock_status: l.stock_status
  };
}

export default function EditListingPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [toggling, setToggling] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    void (async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace(`/login?redirect=${encodeURIComponent(`/seller/listings/${id}/edit`)}`);
        return;
      }

      const [profile, { data: listing }] = await Promise.all([
        fetchSellerProfileByUserId(supabase, session.user.id),
        supabase
          .from("listings")
          .select(
            "id, seller_id, product_name, category, description, price_local, price_currency_code, unit, min_order_quantity, min_order_unit, photo_url, stock_status, is_active"
          )
          .eq("id", id)
          .maybeSingle()
      ]);
      if (cancelled) return;

      if (!listing) {
        setState({ kind: "error", message: "We couldn't find that listing." });
      } else if (!profile || listing.seller_id !== profile.id) {
        setState({ kind: "error", message: "You can only edit your own listings." });
      } else {
        setState({ kind: "ready", listing: listing as ListingRow });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const save = async (payload: ListingSavePayload): Promise<string | null> => {
    if (state.kind !== "ready") return "Listing not loaded.";
    const supabase = createClient();
    // .select() makes a silent RLS refusal (0 rows updated) visible as an error.
    const { data, error } = await supabase
      .from("listings")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", state.listing.id)
      .select("id");
    if (error) return error.message;
    if (!data?.length) return "Couldn't save — you can only edit your own listings.";

    router.push("/dashboard");
    router.refresh();
    return null;
  };

  const toggleVisibility = async () => {
    if (state.kind !== "ready" || toggling) return;
    setToggling(true);
    setToggleError(null);
    const next = !state.listing.is_active;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("listings")
      .update({ is_active: next, updated_at: new Date().toISOString() })
      .eq("id", state.listing.id)
      .select("id");
    setToggling(false);
    if (error || !data?.length) {
      setToggleError(error?.message ?? "Couldn't update the listing.");
      return;
    }
    setState({ kind: "ready", listing: { ...state.listing, is_active: next } });
  };

  return (
    <div className="min-h-screen bg-[#0a1a0f] p-6 text-white">
      <div className="mx-auto max-w-lg">
        <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-400">
          <ArrowLeft size={16} /> Dashboard
        </Link>
        <h1 className="mb-1 text-2xl font-bold">Edit listing</h1>

        {state.kind === "loading" ? (
          <p className="mt-6 text-sm text-gray-400">Loading listing…</p>
        ) : state.kind === "error" ? (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {state.message}
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-gray-400">
              {state.listing.is_active ? (
                <>
                  Live on the marketplace ·{" "}
                  <Link href={`/listing/${state.listing.id}`} className="text-[#5DCAA5]">
                    view as a buyer
                  </Link>
                </>
              ) : (
                <span className="text-[#F5C442]">Hidden — buyers can&apos;t see this listing</span>
              )}
            </p>

            <ListingForm
              initial={toFormValues(state.listing)}
              initialPhotoUrl={state.listing.photo_url}
              submitLabel="Save changes"
              onSave={save}
              footer={
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-semibold">
                    {state.listing.is_active ? "Hide this listing" : "Show this listing again"}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {state.listing.is_active
                      ? "Takes it off the marketplace without deleting it. Your enquiries and reviews are kept, and you can show it again any time."
                      : "Puts it back on the marketplace for buyers to see."}
                  </p>
                  {toggleError ? <p className="mt-2 text-xs text-red-300">{toggleError}</p> : null}
                  <button
                    type="button"
                    onClick={() => void toggleVisibility()}
                    disabled={toggling}
                    className={`mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50 ${
                      state.listing.is_active
                        ? "border border-white/20 text-white hover:bg-white/10"
                        : "bg-[#1D9E75] text-white"
                    }`}
                  >
                    {state.listing.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                    {toggling
                      ? "Updating…"
                      : state.listing.is_active
                        ? "Hide listing"
                        : "Show listing"}
                  </button>
                </div>
              }
            />
          </>
        )}
      </div>
    </div>
  );
}
