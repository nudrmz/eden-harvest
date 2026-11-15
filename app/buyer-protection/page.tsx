import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { COMMISSION_RATE, DISPATCH_DAYS, RELEASE_DAYS_AFTER_DISPATCH } from "@/lib/orders/config";

export const metadata: Metadata = {
  title: "Buyer Protection · Eden Harvest",
  description: "How Eden Harvest holds your payment until your order arrives as described."
};

export default function BuyerProtectionPage() {
  return (
    <main className="app-shell mx-auto min-h-screen w-full max-w-2xl px-4 pb-16 pt-6 text-[var(--text-primary)]">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
        <ArrowLeft size={16} /> Home
      </Link>
      <h1 className="mt-4 flex items-center gap-2 font-heading text-3xl font-bold">
        <ShieldCheck className="text-[#1D9E75]" /> Buyer Protection
      </h1>
      <p className="mt-2 text-[var(--text-secondary)]">
        When you pay for an order in the Eden Harvest app, we hold your money until you confirm the order arrived as described.
        The farmer is only paid after that.
      </p>

      <section className="mt-8 space-y-6 text-sm leading-relaxed">
        <div>
          <h2 className="font-heading text-lg font-semibold">How it works</h2>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[var(--text-secondary)]">
            <li>You pay in the app. Your payment is held by Eden Harvest, not sent to the farmer.</li>
            <li>The farmer has {DISPATCH_DAYS} days to dispatch your order and add proof (a photo, waybill or tracking details). If they don&apos;t, the order is cancelled and you get a full refund.</li>
            <li>When it arrives, tap <strong>Received – all good</strong> and the farmer is paid.</li>
            <li>If you don&apos;t confirm or report a problem within {RELEASE_DAYS_AFTER_DISPATCH} days of dispatch, the order is treated as received and the farmer is paid.</li>
          </ol>
        </div>

        <div>
          <h2 className="font-heading text-lg font-semibold">What&apos;s covered</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[var(--text-secondary)]">
            <li>Your order never arrived.</li>
            <li>You received the wrong item.</li>
            <li>The produce arrived damaged or spoiled.</li>
            <li>You received less than you paid for.</li>
          </ul>
        </div>

        <div>
          <h2 className="font-heading text-lg font-semibold">Reporting a problem</h2>
          <p className="mt-2 text-[var(--text-secondary)]">
            Open the order in <Link href="/orders" className="underline">My orders</Link> and tap <strong>Report a problem</strong> before you
            confirm receipt and within the protection period. Describe what happened and add a photo. The farmer&apos;s payment is held while
            our team reviews it, and we may contact you and the farmer. Depending on what we find, we&apos;ll give you a full refund, a partial
            refund, or release the payment to the farmer if the order matches the listing.
          </p>
        </div>

        <div>
          <h2 className="font-heading text-lg font-semibold">Refunds</h2>
          <p className="mt-2 text-[var(--text-secondary)]">
            Refunds go back to the card or account you paid with. Banks usually take 3–10 working days to show them.
          </p>
        </div>

        <div>
          <h2 className="font-heading text-lg font-semibold">What isn&apos;t covered</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[var(--text-secondary)]">
            <li>Deals paid outside Eden Harvest (cash, direct bank transfer to a farmer, and so on).</li>
            <li>Orders you&apos;ve already marked as received, or reports made after the protection period ends.</li>
            <li>Natural variation in fresh produce that still matches the listing.</li>
          </ul>
        </div>

        <div>
          <h2 className="font-heading text-lg font-semibold">Fees</h2>
          <p className="mt-2 text-[var(--text-secondary)]">
            Buying on Eden Harvest is free. Farmers pay a {Math.round(COMMISSION_RATE * 100)}% fee on the produce price of completed orders.
          </p>
        </div>

        <p className="text-xs text-[var(--text-tertiary)]">
          Questions? <Link href="/support" className="underline">Contact us</Link>. See also our <Link href="/terms" className="underline">Terms</Link>.
        </p>
      </section>
    </main>
  );
}
