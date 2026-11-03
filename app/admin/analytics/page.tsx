"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";

interface Breakdown {
  label: string;
  count: number;
}

interface AnalyticsData {
  days: number;
  visits: {
    status: "ok" | "no_token" | "not_enabled" | "error";
    message?: string;
    pageviews: number;
    visitors: number;
    daily: Breakdown[];
    countries: Breakdown[];
    referrers: Breakdown[];
    devices: Breakdown[];
    pages: Breakdown[];
    utmSources: Breakdown[];
  };
  app: {
    totals: {
      users: number;
      buyers: number;
      sellers: number;
      sellersPending: number;
      activeListings: number;
      enquiries: number;
      paying: number;
      onTrial: number;
      trialsStarted: number;
    };
    period: { newUsers: number; newBuyers: number; newSellers: number; newListings: number; newEnquiries: number };
    signupsDaily: Breakdown[];
    buyerCountries: Breakdown[];
    sellerCountries: Breakdown[];
    listingCategories: Breakdown[];
    listingsBySeller: Breakdown[];
  };
}

const RANGES = [7, 30, 90] as const;
const COUNTRY_NAMES = typeof Intl !== "undefined" && "DisplayNames" in Intl ? new Intl.DisplayNames(["en"], { type: "region" }) : null;

function fmt(n: number): string {
  return n.toLocaleString("en-GB");
}

function countryName(code: string): string {
  if (!/^[A-Z]{2}$/i.test(code)) return code;
  try {
    return COUNTRY_NAMES?.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

function shortDay(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="glass-card p-3">
      <p className="text-[length:calc(11px*var(--fs-small))] uppercase tracking-wide text-[var(--text-tertiary)]">{label}</p>
      <p className="mt-1 font-heading text-2xl font-bold tabular-nums">{value}</p>
      {note ? <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{note}</p> : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="font-heading text-base font-semibold text-eden-gold">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

/** Day-by-day columns. Hover or tap a column to see its number. */
function DailyChart({ data, label }: { data: Breakdown[]; label: string }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((s, d) => s + d.count, 0);
  const shown = active !== null ? data[active] : null;
  return (
    <div className="glass-card p-4">
      <p className="text-sm text-[var(--text-secondary)]">
        {shown ? (
          <>
            <span className="font-semibold text-[var(--text-primary)]">{fmt(shown.count)}</span> {label} on {shortDay(shown.label)}
          </>
        ) : (
          <>
            <span className="font-semibold text-[var(--text-primary)]">{fmt(total)}</span> {label} in total
          </>
        )}
      </p>
      <div className="mt-3 flex h-28 items-end gap-[2px]" onMouseLeave={() => setActive(null)}>
        {data.map((d, i) => (
          <button
            key={d.label}
            type="button"
            aria-label={`${shortDay(d.label)}: ${d.count}`}
            onMouseEnter={() => setActive(i)}
            onClick={() => setActive(i)}
            className="group flex h-full flex-1 items-end"
          >
            <span
              className={`block w-full rounded-t-[3px] ${active === i ? "bg-eden-gold" : "bg-[#1D9E75]"}`}
              style={{ height: d.count ? `${Math.max(4, (d.count / max) * 100)}%` : "2px", opacity: d.count ? 1 : 0.3 }}
            />
          </button>
        ))}
      </div>
      {data.length ? (
        <div className="mt-1.5 flex justify-between text-[11px] text-[var(--text-tertiary)]">
          <span>{shortDay(data[0].label)}</span>
          <span>{shortDay(data[data.length - 1].label)}</span>
        </div>
      ) : null}
    </div>
  );
}

/** Ranked list with a bar behind each number. */
function Bars({ data, empty = "Nothing yet.", format = (s: string) => s }: { data: Breakdown[]; empty?: string; format?: (s: string) => string }) {
  if (!data.length) return <p className="glass-card p-4 text-sm text-[var(--text-secondary)]">{empty}</p>;
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <ul className="glass-card space-y-2.5 p-4">
      {data.map((d) => (
        <li key={d.label}>
          <div className="flex justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{format(d.label)}</span>
            <span className="shrink-0 font-semibold tabular-nums">{fmt(d.count)}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-white/5">
            <div className="h-full rounded-full bg-[#1D9E75]" style={{ width: `${(d.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function VisitorSetup({ status, message }: { status: AnalyticsData["visits"]["status"]; message?: string }) {
  return (
    <div className="glass-card border border-eden-gold/40 p-4 text-sm">
      <p className="font-semibold text-eden-gold">
        {status === "no_token"
          ? "Visitor numbers aren't switched on yet"
          : status === "not_enabled"
            ? "Web Analytics isn't enabled in Vercel yet"
            : "Couldn't load visitor numbers"}
      </p>
      {status === "error" ? (
        <p className="mt-1 text-[var(--text-secondary)]">{message}</p>
      ) : (
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[var(--text-secondary)]">
          <li>
            In Vercel, open the <b>eden-harvest</b> project → <b>Analytics</b> → <b>Enable</b>.
          </li>
          <li>
            Vercel → your avatar → <b>Account Settings</b> → <b>Tokens</b> → create a token.
          </li>
          <li>
            Project → <b>Settings</b> → <b>Environment Variables</b>: add <code>VERCEL_ANALYTICS_TOKEN</code> with that
            token (Production), then redeploy.
          </li>
        </ol>
      )}
      <p className="mt-2 text-xs text-[var(--text-tertiary)]">Counting starts from the day Analytics is enabled.</p>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(range: number) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/analytics?days=${range}`, { cache: "no-store" });
      const body = (await res.json()) as AnalyticsData & { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Couldn't load analytics.");
      setData(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load analytics.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load(days);
  }, [days]);

  const v = data?.visits;
  const a = data?.app;
  const conversion =
    a && a.totals.buyers ? Math.round((a.totals.paying / a.totals.buyers) * 100) : null;

  return (
    <main className="app-shell mx-auto min-h-screen w-full max-w-md px-4 pb-16 pt-6 text-[var(--text-primary)]">
      <Link href="/profile" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
        <ArrowLeft size={16} /> Profile
      </Link>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Analytics</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Visitors, sign-ups and activity on Eden Harvest.</p>
        </div>
        <button
          type="button"
          onClick={() => void load(days)}
          aria-label="Refresh"
          className="mt-1 rounded-full border border-white/10 p-2 text-[var(--text-secondary)]"
        >
          <RefreshCw size={16} className={busy ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl border border-white/10 p-1" role="tablist">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={days === r}
            onClick={() => setDays(r)}
            className={`rounded-lg py-2 text-sm font-semibold ${days === r ? "bg-[#1D9E75] text-white" : "text-[var(--text-secondary)]"}`}
          >
            {r} days
          </button>
        ))}
      </div>

      {error ? <p className="mt-4 text-sm text-[#F09595]">{error}</p> : null}
      {!data && busy ? <p className="mt-6 text-sm text-[var(--text-secondary)]">Loading…</p> : null}

      {data && v && a ? (
        <div className={busy ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <Section title={`Website visits · last ${data.days} days`}>
            {v.status === "ok" ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Tile label="Visitors" value={fmt(v.visitors)} note="unique people" />
                  <Tile label="Page views" value={fmt(v.pageviews)} note={v.visitors ? `${(v.pageviews / v.visitors).toFixed(1)} per visitor` : undefined} />
                </div>
                <div className="mt-2">
                  <DailyChart data={v.daily} label="page views" />
                </div>
              </>
            ) : (
              <VisitorSetup status={v.status} message={v.message} />
            )}
          </Section>

          {v.status === "ok" ? (
            <>
              <Section title="Where visitors are">
                <Bars data={v.countries} format={countryName} />
              </Section>
              <Section title="How they found us">
                <Bars data={v.referrers} empty="No referring sites yet." format={(s) => (s === "Unknown" ? "Direct / app / unknown" : s)} />
              </Section>
              {v.utmSources.length ? (
                <Section title="Campaign links (utm_source)">
                  <Bars data={v.utmSources} />
                </Section>
              ) : null}
              <Section title="Devices">
                <Bars data={v.devices} format={(s) => s.charAt(0).toUpperCase() + s.slice(1)} />
              </Section>
              <Section title="Most viewed pages">
                <Bars data={v.pages} />
              </Section>
            </>
          ) : null}

          <Section title={`Sign-ups · last ${data.days} days`}>
            <div className="grid grid-cols-3 gap-2">
              <Tile label="New" value={fmt(a.period.newUsers)} />
              <Tile label="Buyers" value={fmt(a.period.newBuyers)} />
              <Tile label="Sellers" value={fmt(a.period.newSellers)} />
            </div>
            <div className="mt-2">
              <DailyChart data={a.signupsDaily} label="sign-ups" />
            </div>
          </Section>

          <Section title="Buyers & subscriptions (all time)">
            <div className="grid grid-cols-2 gap-2">
              <Tile label="Buyers" value={fmt(a.totals.buyers)} />
              <Tile label="Paying" value={fmt(a.totals.paying)} note={conversion !== null ? `${conversion}% of buyers` : undefined} />
              <Tile label="On free trial" value={fmt(a.totals.onTrial)} />
              <Tile label="Enquiries" value={fmt(a.totals.enquiries)} note={`${fmt(a.period.newEnquiries)} in ${data.days} days`} />
            </div>
          </Section>

          <Section title="Buyer countries">
            <Bars data={a.buyerCountries} />
          </Section>

          <Section title="Sellers & listings">
            <div className="grid grid-cols-3 gap-2">
              <Tile label="Sellers" value={fmt(a.totals.sellers)} />
              <Tile label="Pending" value={fmt(a.totals.sellersPending)} />
              <Tile label="Listings" value={fmt(a.totals.activeListings)} note={`+${fmt(a.period.newListings)}`} />
            </div>
          </Section>

          <Section title="Seller countries">
            <Bars data={a.sellerCountries} />
          </Section>

          <Section title="Listings by category">
            <Bars data={a.listingCategories} format={(s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ")} />
          </Section>

          <Section title="Listings by farm">
            <Bars data={a.listingsBySeller} />
          </Section>

          <p className="mt-6 text-xs text-[var(--text-tertiary)]">
            Visitor numbers are cookie-free counts from Vercel, so age and gender aren&apos;t available. Everything else
            comes from the Eden Harvest database.
          </p>
        </div>
      ) : null}
    </main>
  );
}
