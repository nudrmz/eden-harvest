import type { Metadata } from "next";
import Link from "next/link";
import { Bullets, LegalPage, SUPPORT_EMAIL } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy · Eden Harvest",
  description: "How Eden Harvest collects, uses and protects your personal data."
};

const mail = (
  <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#1D9E75] hover:underline">
    {SUPPORT_EMAIL}
  </a>
);

const strong = (text: string) => <strong className="text-[var(--text-primary)]">{text}</strong>;

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      otherLink={{ href: "/terms", label: "Terms of Service" }}
      intro={
        <p>
          This policy explains what personal data Eden Harvest (edenharvest.app) collects, why, who we share
          it with, and the choices you have. Eden Harvest is run from the United Kingdom and is the
          &ldquo;controller&rdquo; of your data under UK data protection law (UK GDPR). We never sell your
          personal data.
        </p>
      }
      sections={[
        {
          id: "collect",
          title: "What we collect",
          body: (
            <>
              <p>{strong("Account details")} you give us when you sign up: your name, email address, password (stored securely in scrambled form; we cannot read it), whether you are a buyer or seller, and your country.</p>
              <p>
                {strong("Seller details")} if you list produce: farm or business name, country, region and
                local area, a contact phone or WhatsApp number, a farm photo, and the type and number of the
                registration or ID document you give us so we can verify your farm.
              </p>
              <p>
                {strong("What you post")}: listings, produce photos, prices, messages you send in the app,
                enquiries, reviews and any reports you make.
              </p>
              <p>
                {strong("Subscription details")} if you buy Verified Access: your plan and status, and the
                customer and subscription references Stripe gives us. Stripe handles your card; we never see
                or store your full card number.
              </p>
              <p>
                {strong("Settings")} such as your notification preferences and display currency.
              </p>
              <p>
                {strong("Technical information")}: the country your connection comes from (to show prices in
                your local currency), basic device and browser information, anonymous page-view statistics,
                and, if you arrived through one of our campaign links, which link it was.
              </p>
            </>
          )
        },
        {
          id: "use",
          title: "How we use it, and why",
          body: (
            <>
              <Bullets
                items={[
                  <>
                    {strong("To run the marketplace")}: your account, listings, messages, email alerts about
                    new messages, and your subscription. We need this to provide the service you signed up for
                    (our contract with you).
                  </>,
                  <>
                    {strong("To keep Eden Harvest safe")}: verifying sellers, preventing fraud and spam,
                    and dealing with reports. This is in our legitimate interests and those of our users.
                  </>,
                  <>
                    {strong("To improve Eden Harvest")}: understanding which pages and campaign links are used,
                    using anonymous or minimal data (legitimate interests).
                  </>,
                  <>
                    {strong("To meet legal duties")}, such as keeping payment records for tax (legal
                    obligation).
                  </>,
                  <>
                    {strong("Tips and offers")}: we only send these if you turn them on in Settings →
                    Notifications, and you can turn them off at any time (consent).
                  </>
                ]}
              />
              <p>
                Essential account emails, such as confirming your sign-up or resetting your password, are always
                sent because the service cannot work without them.
              </p>
            </>
          )
        },
        {
          id: "visible",
          title: "What other users can see",
          body: (
            <Bullets
              items={[
                "Seller farm profiles and listings, including farm name, location, photos and prices, are public, so anyone can browse them.",
                "A seller’s contact number may be shown to signed-in users.",
                "Messages are only visible to the people in the conversation (and to us where needed to investigate a report).",
                "Sellers’ verification document numbers are never shown publicly; only Eden Harvest staff can see them."
              ]}
            />
          )
        },
        {
          id: "share",
          title: "Who we share it with",
          body: (
            <>
              <p>We use trusted service providers who process data on our behalf and only as we instruct:</p>
              <Bullets
                items={[
                  <>{strong("Supabase")}: our database, sign-in and photo storage, hosted in London, UK.</>,
                  <>{strong("Vercel")}: hosts the website, and provides anonymous visitor statistics without cookies.</>,
                  <>{strong("Stream")}: powers in-app chat and stores your messages.</>,
                  <>{strong("Stripe")}: processes Verified Access payments.</>,
                  <>{strong("Resend")} and {strong("Zoho")}: send our emails and handle our support inbox.</>
                ]}
              />
              <p>
                We may also share information if the law requires it, to protect people from fraud or harm, or
                as part of a sale or reorganisation of the business (in which case this policy would continue to
                protect your data).
              </p>
            </>
          )
        },
        {
          id: "transfers",
          title: "International transfers",
          body: (
            <p>
              Some of our providers, or their support teams, are based outside the UK, for example in the
              United States. Where your data is transferred abroad, we rely on safeguards recognised under UK
              law, such as adequacy regulations or the UK International Data Transfer Agreement or Addendum.
            </p>
          )
        },
        {
          id: "retention",
          title: "How long we keep it",
          body: (
            <>
              <p>
                We keep your data for as long as you have an account. When you delete your account (Profile →
                Delete account), we immediately and permanently delete your account, profile, listings, photos,
                enquiries, reviews and chat messages, and cancel any subscription.
              </p>
              <p>
                Some records may remain for a limited time where the law requires it or for legitimate business
                reasons. For example, Stripe keeps payment records for tax and fraud purposes, and data may
                remain in secure backups for a short period before being overwritten.
              </p>
            </>
          )
        },
        {
          id: "rights",
          title: "Your rights",
          body: (
            <>
              <p>Under UK data protection law you have the right to:</p>
              <Bullets
                items={[
                  "ask for a copy of the personal data we hold about you;",
                  "correct data that is wrong (you can edit most of it yourself in Settings);",
                  "have your data deleted (use Delete account, or ask us);",
                  "object to or restrict how we use your data in some cases;",
                  "receive your data in a portable format;",
                  "withdraw consent at any time where we rely on it, for example for tips and offers."
                ]}
              />
              <p>
                To use any of these rights, email {mail}. We will reply within one month. If you are unhappy with
                how we handle your data, you can complain to the Information Commissioner&rsquo;s Office at{" "}
                <a
                  href="https://ico.org.uk/make-a-complaint/"
                  className="text-[#1D9E75] hover:underline"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  ico.org.uk
                </a>
                , though we would appreciate the chance to put things right first.
              </p>
            </>
          )
        },
        {
          id: "cookies",
          title: "Cookies and similar technologies",
          body: (
            <>
              <p>We keep this to a minimum and use no advertising or tracking cookies:</p>
              <Bullets
                items={[
                  <>{strong("Sign-in cookies")} keep you logged in. They are essential.</>,
                  <>{strong("A campaign cookie")} (eh_first_touch) remembers, for up to 90 days, which of our promotion links brought you to Eden Harvest, so we can tell which campaigns work.</>,
                  <>{strong("Your browser’s local storage")} remembers small preferences, such as light or dark theme and whether you dismissed the “install app” prompt.</>
                ]}
              />
              <p>Our visitor statistics are anonymous and do not use cookies.</p>
            </>
          )
        },
        {
          id: "children",
          title: "Children",
          body: <p>Eden Harvest is not intended for anyone under 18, and we do not knowingly collect their data.</p>
        },
        {
          id: "security",
          title: "Security",
          body: (
            <p>
              We use encrypted connections (HTTPS), secure password storage and access controls to protect your
              data. No system is perfectly secure, so please use a strong password that you do not use anywhere
              else, and tell us at {mail} if you notice anything suspicious.
            </p>
          )
        },
        {
          id: "changes",
          title: "Changes to this policy",
          body: (
            <p>
              We may update this policy as Eden Harvest develops. We will change the date at the top and, for
              important changes, let you know by email or in the app. See also our{" "}
              <Link href="/terms" className="text-[#1D9E75] hover:underline">
                Terms of Service
              </Link>
              .
            </p>
          )
        },
        {
          id: "contact",
          title: "Contact us",
          body: <p>For any privacy question or request, email {mail}.</p>
        }
      ]}
    />
  );
}
