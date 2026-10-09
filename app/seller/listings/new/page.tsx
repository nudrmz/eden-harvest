"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ensureSellerProfile } from "@/lib/auth/seller";
import { EMPTY_LISTING, ListingForm, type ListingSavePayload } from "@/components/seller/ListingForm";

export default function NewListingPage() {
  const router = useRouter();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const save = async (payload: ListingSavePayload): Promise<string | null> => {
    const supabase = createClient();
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session?.user) return "Not logged in. Please sign in and try again.";

      const { profile, error: sellerError } = await ensureSellerProfile(supabase, session.user.id);
      if (sellerError || !profile) {
        const message = sellerError ?? "Could not load your seller profile.";
        setNeedsOnboarding(message.includes("onboarding"));
        return message;
      }

      const { error } = await supabase
        .from("listings")
        .insert({ ...payload, seller_id: profile.id, is_active: true });
      if (error) return error.message;

      router.push("/dashboard");
      router.refresh();
      return null;
    } catch (err) {
      return `Unexpected error: ${err instanceof Error ? err.message : "Unknown error"}`;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--app-bg)] p-6 text-[var(--text-primary)]">
      <div className="mx-auto max-w-lg">
        <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
          <ArrowLeft size={16} /> Dashboard
        </Link>
        <h1 className="mb-1 text-2xl font-bold">Add a listing</h1>
        <p className="mb-6 text-sm text-[var(--text-secondary)]">Buyers will see this on the marketplace</p>

        {needsOnboarding ? (
          <Link
            href="/onboarding"
            className="mb-4 inline-block text-sm font-semibold text-[#1D9E75]"
          >
            Go to seller onboarding →
          </Link>
        ) : null}

        <ListingForm initial={EMPTY_LISTING} submitLabel="Publish listing" onSave={save} />
      </div>
    </div>
  );
}
