"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import type { StockStatus } from "@/lib/types/listing";
import { uploadPhoto } from "@/lib/storage/photos";

export const LISTING_CATEGORIES = [
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

export const LISTING_UNITS = ["kg", "bag", "crate", "litre", "piece", "tonne"];

export const LISTING_CURRENCIES = ["NGN", "GHS", "KES", "USD", "GBP"];

export const STOCK_OPTIONS: { value: StockStatus; label: string; hint: string }[] = [
  { value: "in_season", label: "In season", hint: "Available now" },
  { value: "bulk_available", label: "Bulk available", hint: "Large quantities ready" },
  { value: "low_stock", label: "Low stock", hint: "Only a little left" },
  { value: "out_of_stock", label: "Out of stock", hint: "Buyers can still see it" },
  { value: "new_listing", label: "New listing", hint: "Just added" }
];

export interface ListingFormValues {
  product_name: string;
  category: string;
  price_local: string;
  price_currency_code: string;
  unit: string;
  min_order_quantity: string;
  min_order_unit: string;
  description: string;
  stock_status: StockStatus;
}

/** What the page saves: form fields parsed for the listings table. */
export interface ListingSavePayload {
  product_name: string;
  category: string;
  price_local: number;
  price_currency_code: string;
  unit: string;
  min_order_quantity: number;
  min_order_unit: string;
  description: string | null;
  stock_status: StockStatus;
  photo_url: string | null;
}

export const EMPTY_LISTING: ListingFormValues = {
  product_name: "",
  category: "",
  price_local: "",
  price_currency_code: "NGN",
  unit: "kg",
  min_order_quantity: "",
  min_order_unit: "kg",
  description: "",
  stock_status: "in_season"
};

// Theme-aware (CSS variables), so text stays readable in both light and dark mode.
const field = "eden-field-input !px-4 !py-3 !text-base";
const label = "mb-1 block text-sm font-medium text-[var(--text-secondary)]";

interface Props {
  initial: ListingFormValues;
  initialPhotoUrl?: string | null;
  submitLabel: string;
  /** Return an error message to show, or null on success. */
  onSave: (payload: ListingSavePayload) => Promise<string | null>;
  /** Extra content under the submit button (e.g. hide/show listing). */
  footer?: React.ReactNode;
}

export function ListingForm({ initial, initialPhotoUrl = null, submitLabel, onSave, footer }: Props) {
  const [form, setForm] = useState<ListingFormValues>(initial);
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("Saving...");
  const [error, setError] = useState("");

  // existingPhoto: the saved URL (cleared when the seller removes it).
  const [existingPhoto, setExistingPhoto] = useState<string | null>(initialPhotoUrl);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  // Keeps the uploaded URL so a retry after a save error doesn't re-upload.
  const [uploadedPhoto, setUploadedPhoto] = useState<{ file: File; url: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!photoFile) {
      setFilePreview(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const photoPreview = filePreview ?? existingPhoto;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const onPhotoPick = (files: FileList | null) => {
    const file = files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    setPhotoFile(file);
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setExistingPhoto(null);
  };

  const handleSubmit = async () => {
    if (!form.product_name.trim() || !form.category || !form.price_local) {
      setError("Please fill in produce name, category and price.");
      return;
    }
    const price = parseFloat(form.price_local);
    if (!Number.isFinite(price) || price <= 0) {
      setError("Please enter a price above zero.");
      return;
    }

    setLoading(true);
    setError("");

    let photoUrl = existingPhoto;
    if (photoFile) {
      if (uploadedPhoto?.file === photoFile) {
        photoUrl = uploadedPhoto.url;
      } else {
        setLoadingLabel("Uploading photo...");
        const { url, error: uploadError } = await uploadPhoto(photoFile, "listing");
        setLoadingLabel("Saving...");
        if (uploadError || !url) {
          setError(uploadError ?? "Could not upload your photo.");
          setLoading(false);
          return;
        }
        photoUrl = url;
        setUploadedPhoto({ file: photoFile, url });
      }
    }

    const minOrder = parseFloat(form.min_order_quantity);
    const saveError = await onSave({
      product_name: form.product_name.trim(),
      category: form.category,
      price_local: price,
      price_currency_code: form.price_currency_code,
      unit: form.unit,
      min_order_quantity: Number.isFinite(minOrder) && minOrder > 0 ? minOrder : 1,
      min_order_unit: form.min_order_unit,
      description: form.description.trim() || null,
      stock_status: form.stock_status,
      photo_url: photoUrl
    });

    if (saveError) {
      setError(saveError);
      setLoading(false);
    }
  };

  return (
    <>
      {error ? (
        <div className="mb-4 rounded-xl border border-[#E5484D55] bg-[#E5484D18] px-4 py-3 text-sm text-[#E5484D]">
          <p>{error}</p>
        </div>
      ) : null}

      <div className="space-y-4">
        <div>
          <label className={label}>Photo</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onPhotoPick(e.target.files)}
          />
          <div className="relative">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex min-h-[160px] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-6 transition hover:border-[#1D9E75]/60"
            >
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoPreview}
                  alt="Produce preview"
                  className="max-h-48 w-full rounded-lg object-cover"
                />
              ) : (
                <>
                  <Camera className="text-[var(--text-tertiary)]" size={28} />
                  <span className="text-sm font-medium text-[var(--text-primary)]">Add a produce photo</span>
                  <span className="text-xs text-[var(--text-tertiary)]">
                    Optional · JPG, PNG or WebP · listings with photos get more enquiries
                  </span>
                </>
              )}
            </button>
            {photoPreview ? (
              <button
                type="button"
                onClick={removePhoto}
                aria-label="Remove photo"
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-[#ffffff] hover:bg-black/80"
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            ) : null}
          </div>
          {photoPreview ? (
            <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">Tap the photo to change it.</p>
          ) : null}
        </div>

        <div>
          <label className={label}>Produce name</label>
          <input
            name="product_name"
            value={form.product_name}
            onChange={handleChange}
            placeholder="e.g. Crayfish, Palm oil, Ogiri"
            className={field}
          />
        </div>

        <div>
          <label className={label}>Category</label>
          <select name="category" value={form.category} onChange={handleChange} className={field}>
            <option value="">Select category</option>
            {LISTING_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className={label}>Price</label>
            <input
              name="price_local"
              value={form.price_local}
              onChange={handleChange}
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className={field}
            />
          </div>
          <div>
            <label className={label}>Currency</label>
            <select
              name="price_currency_code"
              value={form.price_currency_code}
              onChange={handleChange}
              className="eden-field-input !w-auto !px-4 !py-3 !text-base"
            >
              {/* Keep an unusual saved currency selectable when editing. */}
              {[...new Set([...LISTING_CURRENCIES, form.price_currency_code])].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className={label}>Unit</label>
            <select name="unit" value={form.unit} onChange={handleChange} className={field}>
              {[...new Set([...LISTING_UNITS, form.unit])].map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className={label}>Min order</label>
            <input
              name="min_order_quantity"
              value={form.min_order_quantity}
              onChange={handleChange}
              type="number"
              min="0"
              placeholder="1"
              className={field}
            />
          </div>
        </div>

        <div>
          <label className={label}>Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Describe your produce — quality, origin, how it's processed..."
            rows={3}
            className={`${field} resize-none`}
          />
        </div>

        <div>
          <label className={label}>Stock</label>
          <div className="grid grid-cols-2 gap-2">
            {STOCK_OPTIONS.map((opt) => {
              const active = form.stock_status === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, stock_status: opt.value })}
                  aria-pressed={active}
                  className={`rounded-xl border px-3 py-2.5 text-left transition ${
                    active
                      ? "border-[#1D9E75] bg-[#1D9E75]/15 ring-1 ring-[#1D9E75]"
                      : "border-[var(--card-border)] bg-[var(--card-bg)] hover:border-[#1D9E75]/50"
                  }`}
                >
                  <span className="block text-sm font-semibold text-[var(--text-primary)]">{opt.label}</span>
                  <span className="block text-[11px] text-[var(--text-secondary)]">{opt.hint}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={loading}
        className="mt-8 w-full rounded-2xl bg-[#1D9E75] py-4 font-semibold text-[#ffffff] shadow-[0_10px_28px_rgba(29,158,117,0.3)] transition hover:brightness-110 disabled:opacity-50"
      >
        {loading ? loadingLabel : submitLabel}
      </button>

      {footer}
    </>
  );
}
