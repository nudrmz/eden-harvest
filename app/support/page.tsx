import type { Metadata } from "next";
import Link from "next/link";
import { Bullets, LegalPage, SUPPORT_EMAIL } from "@/components/legal/LegalPage";
import { stripeConfig } from "@/lib/stripe/config";

export const metadata: Metadata = {
  title: "Help & Support · Eden Harvest",
  description: "Get help with Eden Harvest: how it works, subscriptions, your account and contacting support."
};

const REPLY_TIME = "within 2 working days";

const mail = (
  <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#1D9E75] hover:underline">
    {SUPPORT_EMAIL}
  </a>
);

const link = (href: string, label: string) => (
  <Link href={href} className="text-[#1D9E75] hover:underline">
    {label}
  </Link>
);

function QA({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold text-[var(--text-primary)]">{q}</h3>
      <div className="mt-1 space-y-2">{children}</div>
    </div>
  );
}

export default function SupportPage() {
  return (
    <LegalPage
      title="Help & Support"
      showUpdated={false}
      otherLink={[
        { href: "/terms", label: "Terms of Service" },
        { href: "/privacy", label: "Privacy Policy" }
      ]}
      intro={
        <div className="glass-card p-4">
          <p className="font-semibold text-[var(--text-primary)]">Contact us</p>
          <p className="mt-1">
            Email {mail} and we&rsquo;ll reply {REPLY_TIME}. Please include the email address on your Eden
            Harvest account and, if it&rsquo;s about a listing or seller, a link to it.
          </p>
        </div>
      }
      sections={[
        {
          id: "how-it-works",
          title: "How Eden Harvest works",
          body: (
            <>
              <QA q="What is Eden Harvest?">
                <p>
                  An online marketplace connecting buyers around the world with farmers and food producers in
                  Africa. Sellers list their produce; buyers browse, compare and message sellers directly in
                  the app.
                </p>
              </QA>
              <QA q="Does Eden Harvest handle payment or delivery?">
                <p>
                  No. Buyers and sellers agree price, payment and delivery between themselves. We don&rsquo;t
                  take payments for produce or arrange shipping. Always agree terms clearly before sending money
                  or goods. See our {link("/terms#trading", "trading guidance")}.
                </p>
              </QA>
              <QA q="Why are prices shown in my currency?">
                <p>
                  To make comparing easier, we convert prices into your local currency using recent exchange
                  rates. These are estimates; the seller&rsquo;s own price and currency is what counts.
                </p>
              </QA>
            </>
          )
        },
        {
          id: "sellers",
          title: "For sellers",
          body: (
            <>
              <QA q="How do I start selling?">
                <p>
                  {link("/register", "Create an account")} and choose &ldquo;I&rsquo;m a seller&rdquo;. Set up
                  your farm profile, then add listings with photos, prices and how much you have.
                </p>
              </QA>
              <QA q="How do I get the Verified badge?">
                <p>
                  During setup you give your farm or business registration details. We review them, and once
                  approved your farm shows a Verified badge. This usually takes a few working days.
                </p>
              </QA>
              <QA q="Does it cost anything to sell?">
                <p>Creating a seller account and listing your produce is free.</p>
              </QA>
            </>
          )
        },
        {
          id: "verified-access",
          title: "Verified Access subscription",
          body: (
            <>
              <QA q="What is Verified Access?">
                <p>
                  An optional subscription for buyers, £{stripeConfig.verifiedAccessMonthlyPriceGbp} a month or £
                  {stripeConfig.verifiedAccessYearlyPriceGbp} a year. It lets you message any seller directly,
                  see every seller&rsquo;s reviews and ratings, and make unlimited enquiries.
                </p>
              </QA>
              <QA q="How do I cancel or change my card?">
                <p>
                  Go to Profile → Manage subscription. You can cancel at any time and keep Verified Access until
                  the end of the period you&rsquo;ve paid for.
                </p>
              </QA>
              <QA q="Can I get a refund?">
                <p>Email {mail} and tell us what happened. Your statutory consumer rights always apply.</p>
              </QA>
            </>
          )
        },
        {
          id: "account",
          title: "Your account",
          body: (
            <>
              <QA q="I forgot my password">
                <p>
                  Use {link("/forgot-password", "Forgot password")} on the log-in page. If the email
                  doesn&rsquo;t arrive within a few minutes, check your spam or junk folder.
                </p>
              </QA>
              <QA q="How do I stop message emails?">
                <p>
                  Go to Settings → Notifications and turn off &ldquo;Message emails&rdquo;, or use the
                  &ldquo;Turn off message emails&rdquo; link at the bottom of any of those emails.
                </p>
              </QA>
              <QA q="How do I delete my account?">
                <p>
                  Go to Profile → Delete account. This permanently removes your account, listings, photos and
                  messages, and cancels any subscription. See our {link("/privacy", "Privacy Policy")}.
                </p>
              </QA>
            </>
          )
        },
        {
          id: "safety",
          title: "Safety and reporting",
          body: (
            <>
              <Bullets
                items={[
                  "Never share your password or one-time codes with anyone, including people claiming to be from Eden Harvest.",
                  "Be cautious with large or upfront payments to sellers you haven't dealt with before. Start small where you can.",
                  "Keep your conversations in the Eden Harvest app where possible, so there's a record."
                ]}
              />
              <p>
                To report a seller, buyer or listing, email {mail} with a link to the listing or profile and
                what happened. We review every report and may remove listings or suspend accounts.
              </p>
            </>
          )
        }
      ]}
    />
  );
}
