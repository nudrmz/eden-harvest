"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const CATEGORIES = [
  "Dried goods", "Grains", "Spices", "Seafood", 
  "Oils", "Fresh produce", "Livestock", "Beverages", 
  "Nuts & Seeds", "Roots & Tubers"
];

const UNITS = ["kg", "bag", "crate", "litre", "piece", "tonne"];

export default function NewListingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    name: "",
    category: "",
    price: "",
    currency: "NGN",
    unit: "kg",
    min_order: "",
    description: "",
    in_stock: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.name || !form.category || !form.price) {
      setError("Please fill in produce name, category and price.");
      return;
    }
    setLoading(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not logged in."); setLoading(false); return; }

    const { error: insertError } = await supabase.from("listings").insert({
      seller_id: user.id,
      product_name: form.name,
      category: form.category,
      price: parseFloat(form.price),
      currency: form.currency,
      unit: form.unit,
      min_order: form.min_order ? parseInt(form.min_order) : 1,
      description: form.description,
      in_stock: form.in_stock,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    router.push("/seller/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#0a1a0f] text-white p-6">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-1">Add a listing</h1>
        <p className="text-gray-400 text-sm mb-6">Buyers will see this on the marketplace</p>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-300 mb-1 block">Produce name</label>
            <input name="name" value={form.name} onChange={handleChange}
              placeholder="e.g. Crayfish, Palm oil, Ogiri"
              className="w-full bg-[#1a2e1f] rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none" />
          </div>

          <div>
            <label className="text-sm text-gray-300 mb-1 block">Category</label>
            <select name="category" value={form.category} onChange={handleChange}
              className="w-full bg-[#1a2e1f] rounded-xl px-4 py-3 text-white outline-none">
              <option value="">Select category</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-sm text-gray-300 mb-1 block">Price</label>
              <input name="price" value={form.price} onChange={handleChange}
                type="number" placeholder="0.00"
                className="w-full bg-[#1a2e1f] rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none" />
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-1 block">Currency</label>
              <select name="currency" value={form.currency} onChange={handleChange}
                className="bg-[#1a2e1f] rounded-xl px-4 py-3 text-white outline-none">
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
              <label className="text-sm text-gray-300 mb-1 block">Unit</label>
              <select name="unit" value={form.unit} onChange={handleChange}
                className="w-full bg-[#1a2e1f] rounded-xl px-4 py-3 text-white outline-none">
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-sm text-gray-300 mb-1 block">Min order</label>
              <input name="min_order" value={form.min_order} onChange={handleChange}
                type="number" placeholder="1"
                className="w-full bg-[#1a2e1f] rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none" />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-300 mb-1 block">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange}
              placeholder="Describe your produce — quality, origin, how it's processed..."
              rows={3}
              className="w-full bg-[#1a2e1f] rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none resize-none" />
          </div>

          <div className="flex items-center justify-between bg-[#1a2e1f] rounded-xl px-4 py-3">
            <span className="text-sm text-gray-300">In stock</span>
            <button onClick={() => setForm({ ...form, in_stock: !form.in_stock })}
              className={`w-12 h-6 rounded-full transition-colors ${form.in_stock ? "bg-green-500" : "bg-gray-600"}`}>
              <div className={`w-5 h-5 bg-white rounded-full mx-0.5 transition-transform ${form.in_stock ? "translate-x-6" : "translate-x-0"}`} />
            </button>
          </div>
        </div>

        <button onClick={handleSubmit} disabled={loading}
          className="w-full mt-8 bg-green-600 hover:bg-green-500 text-white font-semibold py-4 rounded-2xl transition-colors disabled:opacity-50">
          {loading ? "Saving..." : "Publish listing"}
        </button>
      </div>
    </div>
  );
}
