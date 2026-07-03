"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ensureSellerProfile } from "@/lib/auth/seller";
import type { StockStatus } from "@/lib/types/listing";

const CATEGORIES = [
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

const UNITS = ["kg", "bag", "crate", "litre", "piece", "tonne"];

export default function NewListingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    product_name: "",
    category: "",
    price_local: "",
    price_currency_code: "NGN",
    unit: "kg",
    min_order_quantity: "",
    min_order_unit: "kg",
    description: "",
    stock_status: "in_season" as StockStatus
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.product_name || !form.category || !form.price_local) {
      setError("Please fill in produce name, category and price.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setError("Not logged in. Please sign in and try again.");
        setLoading(false);
        return;
      }

      const { profile: sellerProfile, error: sellerError } = await ensureSellerProfile(
        supabase,
        session.user.id
      );

      if (sellerError || !sellerProfile) {
        setError(sellerError ?? "Could not load your seller profile.");
        setLoading(false);
        return;
      }

      const payload = {
        seller_id: sellerProfile.id,
        product_name: form.product_name.trim(),
        category: form.category,
        price_local: parseFloat(form.price_local),
        price_currency_code: form.price_currency_code,
        unit: form.unit,
        min_order_quantity: form.min_order_quantity ? parseFloat(form.min_order_quantity) : 1,
        min_order_unit: form.min_order_unit,
        description: form.description.trim() || null,
        stock_status: form.stock_status,
        is_active: true
      };

      const { error: insertError } = await supabase.from("listings").insert(payload);

      if (insertError) {
        setError(insertError.message);
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`Unexpected error: ${message}`);
      setLoading(false);
    }
  };

  const inStock = form.stock_status === "in_season";

  return (
    <div className="min-h-screen bg-[#0a1a0f] p-6 text-white">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-1 text-2xl font-bold">Add a listing</h1>
        <p className="mb-6 text-sm text-gray-400">Buyers will see this on the marketplace</p>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <p>{error}</p>
            {error.includes("onboarding") ? (
              <Link href="/onboarding" className="mt-2 inline-block font-semibold text-[#5DCAA5]">
                Go to seller onboarding →
              </Link>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-300">Produce name</label>
            <input
              name="product_name"
              value={form.product_name}
              onChange={handleChange}
              placeholder="e.g. Crayfish, Palm oil, Ogiri"
              className="w-full rounded-xl bg-[#1a2e1f] px-4 py-3 text-white outline-none placeholder:text-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-300">Category</label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full rounded-xl bg-[#1a2e1f] px-4 py-3 text-white outline-none"
            >
              <option value="">Select category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm text-gray-300">Price</label>
              <input
                name="price_local"
                value={form.price_local}
                onChange={handleChange}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full rounded-xl bg-[#1a2e1f] px-4 py-3 text-white outline-none placeholder:text-gray-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-300">Currency</label>
              <select
                name="price_currency_code"
                value={form.price_currency_code}
                onChange={handleChange}
                className="rounded-xl bg-[#1a2e1f] px-4 py-3 text-white outline-none"
              >
                <option value="NGN">NGN</option>
                <option value="GHS">GHS</option>
                <option value="KES">KES</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm text-gray-300">Unit</label>
              <select
                name="unit"
                value={form.unit}
                onChange={handleChange}
                className="w-full rounded-xl bg-[#1a2e1f] px-4 py-3 text-white outline-none"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm text-gray-300">Min order</label>
              <input
                name="min_order_quantity"
                value={form.min_order_quantity}
                onChange={handleChange}
                type="number"
                min="0"
                placeholder="1"
                className="w-full rounded-xl bg-[#1a2e1f] px-4 py-3 text-white outline-none placeholder:text-gray-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-300">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe your produce — quality, origin, how it's processed..."
              rows={3}
              className="w-full resize-none rounded-xl bg-[#1a2e1f] px-4 py-3 text-white outline-none placeholder:text-gray-500"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl bg-[#1a2e1f] px-4 py-3">
            <span className="text-sm text-gray-300">In stock</span>
            <button
              type="button"
              onClick={() =>
                setForm({
                  ...form,
                  stock_status: inStock ? "out_of_stock" : "in_season"
                })
              }
              className={`h-6 w-12 rounded-full transition-colors ${inStock ? "bg-green-500" : "bg-gray-600"}`}
              aria-pressed={inStock}
            >
              <div
                className={`mx-0.5 h-5 w-5 rounded-full bg-white transition-transform ${inStock ? "translate-x-6" : "translate-x-0"}`}
              />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={loading}
          className="mt-8 w-full rounded-2xl bg-green-600 py-4 font-semibold text-white transition-colors hover:bg-green-500 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Publish listing"}
        </button>
      </div>
    </div>
  );
}
