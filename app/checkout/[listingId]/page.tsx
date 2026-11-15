"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Lock, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/supabase/hooks";
import { money } from "@/lib/orders/format";
import { COMMISSION_RATE, orderAmounts } from "@/lib/orders/config";
import { pluralise } from "@/lib/listings/units";

interface CheckoutListing {
  id: string;
  product_name: string;
  price_local: number;
  price_currency_code: string;
  unit: string;
  min_order_quantity: number | null;
  delivery_fee: number | null;
  delivery_note: string | null;
  photo_url: string | null;
  seller_id: string;
}

const field = "eden-field-input !px-4 !py-3 !text-base";
const label = "mb-1 block text-sm font-medium text-[var(--text-secondary)]";

export default function CheckoutPage() {
  const { listingId } = useParams<{ listingId: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [listing, setListing] = useState<CheckoutListing | null>(null);
  const [farm, setFarm] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState("1");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace(`/login?redirect=${encodeURIComponent(`/checkout/${listingId}`)}`);
  }, [authLoading, user, router, listingId]);

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const { data } = await supabase
        .from("listings")
        .select("id, product_name, price_local, price_currency_code, unit, min_order_quantity, delivery_fee, delivery_note, photo_url, seller_id")
        .eq("id", listingId)
        .eq("is_active", true)
        .maybeSingle();
      if (data) {
        setListing(data as CheckoutListing);
        setQuantity(String(Number(data.min_order_quantity) || 1));
        const { data: s } = await supabase.from("seller_profiles").select("farm_name").eq("id", data.seller_id).maybeSingle();
        setFarm((s?.farm_name as string) ?? "");
      }
      setLoading(false);
    })();
  }, [listingId]);

  useEffect(() => {
    if (user?.full_name && !name) setName(user.full_name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const qty = Number(quantity);
  const minOrder = Number(listing?.min_order_quantity) || 1;
  const amounts = useMemo(
    () => (listing ? orderAmounts(Number(listing.price_local), Number.isFinite(qty) ? qty : 0, Number(listing.delivery_fee) || 0) : null),
    [listing, qty]
  );
  const currency = listing?.price_currency_code ?? "NGN";

  async function pay() {
    setError(null);
    if (!listing) return;
    if (!Number.isFinite(qty) || qty < minOrder) {
      setError(`The minimum order is ${minOrder} ${pluralise(listing.unit, minOrder)}.`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, quantity: qty, deliveryName: name, deliveryPhone: phone, deliveryAddress: address, note })
      });
      const body = (await res.json()) as { paymentUrl?: string; error?: string };
      if (!res.ok || !body.paymentUrl) throw new Error(body.error ?? "Couldn't start payment.");
      window.location.href = body.paymentUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start payment.");
      setBusy(false);
    }
  }

  if (loading || authLoading) {
    return <main className="app-shell mx-auto min-h-screen max-w-md px-4 pt-10 text-sm text-[var(--text-secondary)]">Loading…</main>;
  }
  if (!listing) {
    return (
      <main className="app-shell mx-auto min-h-screen max-w-md px-4 pt-10 text-[var(--text-primary)]">
        <p>This listing isn&apos;t available any more.</p>
        <Link href="/browse" className="mt-3 inline-block text-eden-gold underline">Browse produce</Link>
      </main>
    );
  }
  if (currency !== "NGN") {
    return (
      <main className="app-shell mx-auto min-h-screen max-w-md px-4 pt-10 text-[var(--text-primary)]">
        <p>In-app checkout is only open for listings priced in Naira for now. Please message the farmer instead.</p>
        <Link href={`/listing/${listing.id}`} className="mt-3 inline-block text-eden-gold underline">Back to listing</Link>
      </main>
    );
  }

  return (
    <main className="app-shell mx-auto min-h-screen w-full max-w-md px-4 pb-16 pt-6 text-[var(--text-primary)]">
      <Link href={`/listing/${listing.id}`} className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
        <ArrowLeft size={16} /> Back to listing
      </Link>
      <h1 className="mt-4 font-heading text-2xl font-bold">Checkout</h1>

      <section className="glass-card mt-4 flex gap-3 p-3">
        {listing.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.photo_url} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
        ) : null}
        <div className="min-w-0">
          <p className="font-semibold">{listing.product_name}</p>
          <p className="text-sm text-[var(--text-secondary)]">{farm}</p>
          <p className="mt-1 text-sm font-semibold text-eden-gold">
            {money(listing.price_local, currency)} / {listing.unit}
          </p>
        </div>
      </section>

      <section className="mt-4 space-y-4">
        <div>
          <label className={label}>Quantity ({pluralise(listing.unit, 2)}) · minimum {minOrder}</label>
          <input value={quantity} onChange={(e) => setQuantity(e.target.value)} type="number" inputMode="decimal" min={minOrder} step="any" className={field} />
        </div>
        <div>
          <label className={label}>Full name for delivery</label>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className={field} />
        </div>
        <div>
          <label className={label}>Phone number for the delivery driver</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" maxLength={40} placeholder="+234…" className={field} />
        </div>
        <div>
          <label className={label}>Delivery address</label>
          <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} maxLength={500} placeholder="House number, street, area, city, state" className={`${field} resize-none`} />
          {listing.delivery_note ? <p className="mt-1 text-xs text-[var(--text-tertiary)]">Farmer&apos;s delivery info: {listing.delivery_note}</p> : null}
        </div>
        <div>
          <label className={label}>Note for the farmer <span className="font-normal">(optional)</span></label>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className={field} />
        </div>
      </section>

      {amounts ? (
        <section className="glass-card mt-5 space-y-2 p-4 text-sm">
          <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Produce</span><span>{money(amounts.subtotal, currency)}</span></div>
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">Delivery</span>
            <span>{amounts.delivery ? money(amounts.delivery, currency) : "Included"}</span>
          </div>
          <div className="flex justify-between border-t border-white/10 pt-2 text-base font-bold">
            <span>Total</span><span className="text-eden-gold">{money(amounts.total, currency)}</span>
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">No fees for buyers. Eden Harvest&apos;s {Math.round(COMMISSION_RATE * 100)}% is paid by the farmer.</p>
        </section>
      ) : null}

      <div className="mt-4 flex gap-2 rounded-xl border border-[#1D9E75]/40 bg-[#1D9E75]/10 p-3 text-xs text-[var(--text-secondary)]">
        <ShieldCheck size={18} className="shrink-0 text-[#1D9E75]" />
        <p>
          <span className="font-semibold text-[var(--text-primary)]">Buyer Protection.</span> We hold your payment until you confirm
          the order arrived as described. If it doesn&apos;t, report a problem and we&apos;ll put it right.{" "}
          <Link href="/buyer-protection" className="underline">How it works</Link>
        </p>
      </div>

      {error ? <p className="mt-3 text-sm text-[#F09595]">{error}</p> : null}
      <button
        type="button"
        onClick={() => void pay()}
        disabled={busy}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1D9E75] py-3.5 font-semibold text-white disabled:opacity-60"
      >
        <Lock size={16} /> {busy ? "Opening secure payment…" : `Pay ${amounts ? money(amounts.total, currency) : ""}`}
      </button>
      <p className="mt-2 text-center text-xs text-[var(--text-tertiary)]">Secure card, bank transfer or USSD payment by Paystack.</p>
    </main>
  );
}
