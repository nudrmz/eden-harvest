"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";

interface LookupResult {
  found: boolean;
  email: string;
  account?: {
    createdAt: string;
    emailConfirmedAt: string | null;
    lastSignInAt: string | null;
    signedUpWith: string;
    roleChosenAtSignUp: string | null;
  };
  profile?: { full_name: string | null; role: string; country_code: string | null } | null;
  seller?: {
    farm_name: string;
    state_region: string;
    verification_status?: string | null;
    is_verified: boolean;
    created_at: string;
  } | null;
  listingCount?: number;
}

function when(iso: string | null | undefined): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London"
  });
}

/** Plain-English verdict on where this person is stuck. */
function verdict(r: LookupResult): string {
  if (!r.found) {
    return "No account with this email. They never finished signing up, or used a different email.";
  }
  const a = r.account!;
  if (!a.emailConfirmedAt) {
    return "Signed up but hasn't confirmed their email yet, so they can't log in. Ask them to tap the link in the email from Eden Harvest (check spam or junk).";
  }
  if (!a.lastSignInAt) return "Email confirmed, but they've never logged in.";
  if (r.seller) {
    const status = r.seller.verification_status ?? (r.seller.is_verified ? "approved" : "pending");
    if (status === "pending") {
      return "Finished seller set-up and is waiting for your approval in Seller verification.";
    }
    if (status === "approved" || r.seller.is_verified) {
      return r.listingCount
        ? "Approved seller with listings."
        : "Approved seller, but hasn't added any produce yet.";
    }
    return `Seller set-up was ${status}.`;
  }
  if (a.roleChosenAtSignUp === "seller" || r.profile?.role === "seller") {
    return "Chose to sell but hasn't finished the 5-step seller set-up, so there's no farm profile yet. When they log in they'll be taken back to it.";
  }
  return "Logged in as a buyer. No seller profile. If they meant to sell, they can tap Sell at the bottom of the app to start seller set-up.";
}

export default function AdminUserLookupPage() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Links from the sign-up alert email arrive with ?email=… and search straight away.
  useEffect(() => {
    const fromLink = new URLSearchParams(window.location.search).get("email");
    if (fromLink) {
      setEmail(fromLink);
      void runLookup(fromLink);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function lookUp(event: FormEvent) {
    event.preventDefault();
    await runLookup(email);
  }

  async function runLookup(address: string) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/user-lookup?email=${encodeURIComponent(address.trim())}`);
      const body = (await res.json()) as LookupResult & { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Lookup failed.");
      setResult(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed.");
    } finally {
      setBusy(false);
    }
  }

  const rows: [string, string][] = result?.found
    ? [
        ["Name", result.profile?.full_name ?? "—"],
        ["Account created", when(result.account?.createdAt)],
        ["Email confirmed", when(result.account?.emailConfirmedAt)],
        ["Last signed in", when(result.account?.lastSignInAt)],
        ["Signed up with", result.account?.signedUpWith === "google" ? "Google" : "Email & password"],
        ["Chose at sign-up", result.account?.roleChosenAtSignUp ?? "—"],
        ["Role now", result.profile?.role ?? "No profile row"],
        [
          "Farm",
          result.seller
            ? `${result.seller.farm_name} (${result.seller.state_region}) · ${
                result.seller.verification_status ?? (result.seller.is_verified ? "approved" : "pending")
              }`
            : "None"
        ],
        ["Listings", String(result.listingCount ?? 0)]
      ]
    : [];

  return (
    <main className="app-shell mx-auto min-h-screen w-full max-w-md px-4 pb-16 pt-6 text-[var(--text-primary)]">
      <Link href="/profile" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
        <ArrowLeft size={16} /> Profile
      </Link>
      <h1 className="mt-4 font-heading text-2xl font-bold">Look up a user</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        See whether someone signed up, confirmed their email and finished seller set-up.
      </p>

      <form onSubmit={(e) => void lookUp(e)} className="mt-5 flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          className="eden-field-input min-w-0 flex-1"
          required
        />
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#1D9E75] px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          <Search size={16} /> {busy ? "…" : "Find"}
        </button>
      </form>

      {error ? <p className="mt-4 text-sm text-[#F09595]">{error}</p> : null}

      {result ? (
        <section className="glass-card mt-5 p-4">
          <p className="text-sm font-semibold text-eden-gold">{verdict(result)}</p>
          {rows.length ? (
            <dl className="mt-4 space-y-2 text-sm">
              {rows.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-[var(--text-tertiary)]">{label}</dt>
                  <dd className="text-right">{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
