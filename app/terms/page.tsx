import type { Metadata } from "next";
import Link from "next/link";
import { Bullets, LegalPage, SUPPORT_EMAIL } from "@/components/legal/LegalPage";
import { stripeConfig } from "@/lib/stripe/config";

export const metadata: Metadata = {
  title: "Terms of Service · Eden Harvest",
  description: "The terms for using Eden Harvest, the marketplace connecting buyers with African farmers."
};

const mail = (
  <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#1D9E75] hover:underline">
    {SUPPORT_EMAIL}
  </a>
);

export default function TermsPage() {
  const monthly = stripeConfig.verifiedAccessMonthlyPriceGbp;
  const yearly = stripeConfig.verifiedAccessYearlyPriceGbp;

  return (
    <LegalPage
      title="Terms of Service"
      otherLink={{ href: "/privacy", label: "Privacy Policy" }}
      intro={
        <>
          <p>
            These terms apply when you use Eden Harvest at edenharvest.app (&ldquo;Eden Harvest&rdquo;,
            &ldquo;we&rdquo;, &ldquo;us&rdquo;). Eden Harvest is run from the United Kingdom. By creating
            an account or using the site, you agree to these terms. Please read them, especially the parts
            about trading with other users (section 3) and our responsibility to you (section 10).
          </p>
        </>
      }
      sections={[
        {
          id: "what-we-do",
          title: "What Eden Harvest is",
          body: (
            <>
              <p>
                Eden Harvest is an online marketplace that helps buyers, many of them in the UK, Europe and
                North America, find and contact farmers and food producers in Africa. Sellers list their
                produce; buyers browse listings and message sellers in the app.
              </p>
              <p>
                <strong className="text-[var(--text-primary)]">
                  We are a place to meet, not a party to your deals.
                </strong>{" "}
                We do not sell produce ourselves, we do not take or hold payments for produce, and we do not
                arrange shipping, delivery, customs or logistics. Those are agreed directly between buyer and
                seller.
              </p>
            </>
          )
        },
        {
          id: "accounts",
          title: "Your account",
          body: (
            <Bullets
              items={[
                "You must be at least 18 years old to create an account.",
                "Give accurate information and keep it up to date. Sellers must describe their farm or business truthfully.",
                "Keep your password private. You are responsible for activity on your account. Tell us straight away if you think someone else has access to it.",
                "One person or business per account. Do not impersonate anyone else."
              ]}
            />
          )
        },
        {
          id: "trading",
          title: "Trading between buyers and sellers",
          body: (
            <>
              <p>
                Any sale is a contract between the buyer and the seller only. The two of you agree the price,
                quantity, quality, payment method, delivery and any other terms. Before you complete a deal:
              </p>
              <Bullets
                items={[
                  "Check the seller, the produce and the terms carefully. Ask for photos, samples or references where sensible.",
                  "Agree payment and delivery terms clearly, in writing, before any money or goods change hands.",
                  "Buyers are responsible for import rules, customs duties and food-safety requirements in their own country. Sellers are responsible for export rules, licences and taxes in theirs.",
                  "Be cautious with large or upfront payments to someone you have not dealt with before."
                ]}
              />
              <p>
                A &ldquo;Verified&rdquo; badge means we have reviewed the seller&rsquo;s registration
                details. It is not a guarantee of quality, delivery or a successful trade, and it does not
                make us responsible for the seller&rsquo;s products or conduct.
              </p>
              <p>
                If you have a problem with another user, try to resolve it with them first. You can also
                report a user or listing to us at {mail}; we will review it and may remove content or
                suspend accounts, but we cannot settle disputes or recover money for you.
              </p>
            </>
          )
        },
        {
          id: "sellers",
          title: "Rules for sellers",
          body: (
            <Bullets
              items={[
                "Only list produce you genuinely have, or can supply, and that is legal to sell and export.",
                "Describe listings accurately, including price, currency, unit, quantity available and condition, and keep stock status up to date.",
                "Use your own photos, or photos you have permission to use.",
                "Respond honestly to buyers and honour deals you agree to.",
                "You are responsible for your own licences, permits, food-safety standards and taxes."
              ]}
            />
          )
        },
        {
          id: "verified-access",
          title: "Verified Access subscription",
          body: (
            <>
              <p>
                Verified Access is an optional paid subscription for buyers. It currently costs £{monthly} a
                month or £{yearly} a year, shown before you pay. Payments are processed securely by Stripe; we
                never see or store your full card details.
              </p>
              <Bullets
                items={[
                  "Your subscription renews automatically at the end of each month or year until you cancel.",
                  "You can cancel at any time from your Profile using “Manage subscription”. You keep Verified Access until the end of the period you have already paid for, and you will not be charged again.",
                  "We do not give refunds for partly used periods, except where the law requires it or we decide to in a particular case.",
                  "If we change the price, we will tell you in advance and the new price will apply from your next renewal. You can cancel before then if you do not want to continue."
                ]}
              />
              <p>
                Nothing in these terms affects your legal rights as a consumer, including any right you may
                have to cancel within 14 days of first subscribing. To ask about a refund, email {mail}.
              </p>
            </>
          )
        },
        {
          id: "conduct",
          title: "What you must not do",
          body: (
            <Bullets
              items={[
                "Scam, defraud or mislead other users, or ask them to pay for goods you do not intend to supply.",
                "List illegal, counterfeit, unsafe or restricted goods.",
                "Harass, threaten or abuse anyone, or send spam.",
                "Post content that is unlawful, hateful, or infringes someone else’s rights.",
                "Try to access other people’s accounts or data, disrupt the site, or copy it with bots or scrapers."
              ]}
            />
          )
        },
        {
          id: "content",
          title: "Your content",
          body: (
            <p>
              You keep ownership of the listings, photos and messages you post. You give us permission to
              store, display and share them on Eden Harvest as needed to run the service (for example, showing
              your listing to buyers or previewing it when a link is shared). We may remove content that
              breaks these terms.
            </p>
          )
        },
        {
          id: "ending",
          title: "Suspending or closing accounts",
          body: (
            <>
              <p>
                We may suspend or close an account, or remove listings, if we reasonably believe these terms
                have been broken, to protect other users, or if the law requires it. Where appropriate we will
                tell you why.
              </p>
              <p>
                You can delete your account at any time from Profile → Delete account. This permanently
                removes your account and data as described in our{" "}
                <Link href="/privacy" className="text-[#1D9E75] hover:underline">
                  Privacy Policy
                </Link>
                , and cancels any Verified Access subscription straight away.
              </p>
            </>
          )
        },
        {
          id: "service",
          title: "The service",
          body: (
            <p>
              We work hard to keep Eden Harvest running smoothly, but we cannot promise it will always be
              available or error-free. We may change, add or remove features. Prices shown in other
              currencies are estimates using recent exchange rates; the seller&rsquo;s own price and currency
              is what counts.
            </p>
          )
        },
        {
          id: "liability",
          title: "Our responsibility to you",
          body: (
            <>
              <p>
                Because deals happen directly between users, we are not responsible for the quality, safety,
                legality or delivery of produce, for payments between users, or for anything a user says or
                does. We are not liable for losses arising from trades between users.
              </p>
              <p>
                Where we are responsible, our total liability to you is limited to the amount you have paid us
                in the 12 months before the problem arose. We are not liable for indirect losses or lost
                profits.
              </p>
              <p>
                Nothing in these terms limits liability that cannot be limited by law, including for death or
                personal injury caused by negligence, for fraud, or your statutory rights as a consumer.
              </p>
            </>
          )
        },
        {
          id: "changes",
          title: "Changes to these terms",
          body: (
            <p>
              We may update these terms from time to time. We will change the date at the top and, for
              important changes, tell you by email or in the app. If you keep using Eden Harvest after a
              change, the new terms apply.
            </p>
          )
        },
        {
          id: "law",
          title: "Law and disputes",
          body: (
            <p>
              These terms are governed by the law of England and Wales, and disputes will be handled by the
              courts of England and Wales. If you live in Scotland or Northern Ireland, you may also bring
              proceedings in your local courts.
            </p>
          )
        },
        {
          id: "contact",
          title: "Contact us",
          body: <p>For any question about these terms, email {mail}.</p>
        }
      ]}
    />
  );
}
