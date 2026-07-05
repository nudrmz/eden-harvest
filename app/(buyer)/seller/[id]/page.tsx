"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Flag, MessageCircle, Share2, Star, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { useTheme } from "@/components/layout/ThemeProvider";
import { createClient } from "@/lib/supabase/client";

function renderStars(value: number) {
  const full = Math.round(value);
  return Array.from({ length: 5 }, (_, index) => (
    <Star
      key={`star-${index}`}
      size={12}
      className={index < full ? "fill-eden-gold text-eden-gold" : "text-white/25"}
    />
  ));
}

export default function SellerProfilePage() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const supabase = createClient();

  const [seller, setSeller] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [enquirySent, setEnquirySent] = useState(false);

  useEffect(() => {
    const fetchSeller = async () => {
      const { data: profile } = await supabase
        .from("seller_profiles")
        .select("*")
        .eq("user_id", params.id)
        .single();

      if (profile) setSeller(profile);

      const { data: sellerListings } = await supabase
        .from("listings")
        .select("*")
        .eq("seller_id", params.id)
        .eq("is_active", true)
        .limit(4);

      if (sellerListings) setListings(sellerListings);
      setLoading(false);
    };

    fetchSeller();
  }, [params.id]);

  const handleContact = async () => {
    if (!seller?.whatsapp_number) return;

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("enquiries").insert({
        buyer_id: user.id,
        seller_id: params.id,
      });
      setEnquirySent(true);
    }

    const phone = seller.whatsapp_number.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}`, "_blank");
  };

  if (loading) {
    return (
      <main className="app-shell mx-auto min-h-screen w-full max-w-md flex items-center justify-center">
        <p className="text-white/50 text-sm">Loading seller profile...</p>
      </main>
    );
  }

  if (!seller) {
    return (
      <main className="app-shell mx-auto min-h-screen w-full max-w-md flex items-center justify-center">
        <p className="text-white/50 text-sm">Seller not found.</p>
      </main>
    );
  }

  return (
    <main className="app-shell mx-auto min-h-screen w-full max-w-md pb-24">
      <section className="relative h-[250px] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: seller.farm_photo_url ? `url('${seller.farm_photo_url}')` : "url('/images/hero-farmers.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/70" />
        <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="glass-card flex h-10 w-10 items-center justify-center rounded-full"
          >
            <ArrowLeft size={16} />
          </button>
          <button type="button" className="glass-card flex h-10 w-10 items-center justify-center rounded-full">
            <Share2 size={16} />
          </button>
        </div>
      </section>

      <section className="relative -mt-8 px-4">
        <div className="glass-card p-4">
          <h1 className={`font-heading text-[20px] font-bold ${theme === "dark" ? "text-white" : "text-[#1A1A18]"}`}>
            {seller.farm_name}
          </h1>
          <p className={`mt-1 text-xs ${theme === "dark" ? "text-white/65" : "text-[#444441]"}`}>
            {seller.state_region}
          </p>
          <div className="mt-3 flex items-center gap-2">
            {seller.is_verified ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-eden-gold/35 bg-eden-gold/15 px-2.5 py-1 text-[10px] font-semibold text-eden-gold">
                <CheckCircle2 size={12} />
                Verified seller
              </span>
            ) : (
              <span className={`rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] ${theme === "dark" ? "text-white/65" : "text-[#444441]"}`}>
                Unverified
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-2xl font-semibold">{(seller.average_rating ?? 0).toFixed(1)}</span>
            <div className="flex items-center gap-0.5">{renderStars(seller.average_rating ?? 0)}</div>
            <span className={`text-xs ${theme === "dark" ? "text-white/60" : "text-[#444441]"}`}>
              ({seller.total_reviews ?? 0} reviews)
            </span>
          </div>
        </div>
      </section>

      <section className="px-4 pt-4">
        <button
          onClick={handleContact}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-medium text-[#092012]"
        >
          <MessageCircle size={16} />
          {enquirySent ? "Contacted on WhatsApp" : "Contact on WhatsApp"}
        </button>
        <p className="mt-2 text-[11px] text-white/45">
          Deals happen directly between you and the seller via WhatsApp
        </p>
      </section>

      <section className="px-4 pt-4">
        <div className="glass-card p-4">
          <h2 className={`eden-section-title ${theme === "dark" ? "text-white" : "text-[#1A1A18]"}`}>About this farm</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-medium">
            <p className={theme === "dark" ? "text-white/75" : "text-[#444441]"}>Location: {seller.state_region}</p>
            <p className={theme === "dark" ? "text-white/75" : "text-[#444441]"}>WhatsApp: {seller.whatsapp_number}</p>
          </div>
        </div>
      </section>

      {listings.length > 0 && (
        <section className="px-4 pt-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className={`eden-section-title ${theme === "dark" ? "text-white" : "text-[#1A1A18]"}`}>Available produce</h2>
            <span className={`text-xs ${theme === "dark" ? "text-white/55" : "text-[#444441]"}`}>{listings.length} listings</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {listings.map((item) => (
              <div key={item.id} className="glass-card p-3">
                <p className="text-sm font-semibold">{item.product_name}</p>
                <p className="text-xs text-white/55 mt-1">{item.category}</p>
                <p className="text-sm font-bold text-eden-gold mt-2">
                  {item.price_currency_code} {item.price_local?.toLocaleString()}
                  <span className="text-xs font-normal text-white/50"> / {item.unit}</span>
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="px-4 pb-4 pt-4">
        <button
          type="button"
          onClick={() => setReportModalOpen(true)}
          className="inline-flex items-center gap-1 text-xs text-white/50 underline-offset-2 hover:underline"
        >
          <Flag size={12} />
          Report this seller
        </button>
      </section>

      {reportModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
          <div className="glass-card w-full max-w-sm p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base font-semibold">Report this seller</h3>
              <button type="button" onClick={() => setReportModalOpen(false)}>
                <X size={16} className="text-white/65" />
              </button>
            </div>
            <textarea
              rows={4}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Describe the issue..."
              className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-eden-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={() => { setReportReason(""); setReportModalOpen(false); }}
              className="mt-3 w-full rounded-xl bg-eden-primary py-2.5 text-sm font-medium"
            >
              Submit report
            </button>
          </div>
        </div>
      )}

      <MobileBottomNav active="home" />
    </main>
  );
}                                                                              