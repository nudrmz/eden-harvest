import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/auth/admin";
import { getVisitStats } from "@/lib/analytics/visits";
import { trialEndsAt } from "@/lib/access/trial";
import { countryByCode } from "@/lib/data/buyer-countries";

export const dynamic = "force-dynamic";

/** Admin-only numbers for the Analytics page: visitors (Vercel) + app data (database). */

type Row = Record<string, unknown>;
interface Breakdown {
  label: string;
  count: number;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
/** Ranges the page offers. "24h" is for checking what's happening today. */
const RANGES: Record<string, { ms: number; label: string }> = {
  "24h": { ms: 24 * HOUR, label: "24 hours" },
  "7": { ms: 7 * DAY, label: "7 days" },
  "30": { ms: 30 * DAY, label: "30 days" },
  "90": { ms: 90 * DAY, label: "90 days" }
};

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function tally(values: (string | null | undefined)[], limit = 10): Breakdown[] {
  const map = new Map<string, number>();
  for (const v of values) {
    const key = (v ?? "").trim() || "Unknown";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** One entry per day in the window, zeros included, so charts don't skip days. */
function perDay(dates: string[], days: number): Breakdown[] {
  const counts = new Map<string, number>();
  for (const d of dates) counts.set(dayKey(d), (counts.get(dayKey(d)) ?? 0) + 1);
  const out: Breakdown[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const key = dayKey(new Date(today.getTime() - i * DAY).toISOString());
    out.push({ label: key, count: counts.get(key) ?? 0 });
  }
  return out;
}

/** Hourly slots for short windows, labelled with the slot's start time (ISO). */
function perSlot(dates: string[], windowMs: number, slotMs = HOUR): Breakdown[] {
  const now = Date.now();
  const first = Math.floor((now - windowMs) / slotMs) * slotMs;
  const out: Breakdown[] = [];
  for (let t = first; t <= now; t += slotMs) out.push({ label: new Date(t).toISOString(), count: 0 });
  for (const d of dates) {
    const i = Math.floor((new Date(d).getTime() - first) / slotMs);
    if (i >= 0 && i < out.length) out[i].count += 1;
  }
  return out;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server admin client is not configured." }, { status: 500 });
  }

  const rangeKey = request.nextUrl.searchParams.get("range") ?? request.nextUrl.searchParams.get("days") ?? "30";
  const range = RANGES[rangeKey] ? rangeKey : "30";
  const windowMs = RANGES[range].ms;
  const sinceIso = new Date(Date.now() - windowMs).toISOString();

  const [visits, usersRes, listingsRes, enquiriesRes, sellersRes, countriesRes] = await Promise.all([
    getVisitStats(windowMs),
    admin.from("users").select("id, role, country_code, created_at"),
    admin.from("listings").select("id, category, is_active, created_at, seller_id"),
    admin.from("enquiries").select("id, buyer_id, created_at"),
    admin.from("seller_profiles").select("id, user_id, farm_name, african_country_id, is_verified, verification_status, created_at"),
    admin.from("african_countries").select("id, name")
  ]);

  // Subscriptions and trials live on the sign-in accounts. Admin accounts
  // (ADMIN_EMAILS) are left out of every number on this page.
  const adminIds = new Set<string>();
  let paying = 0;
  let onTrial = 0;
  let trialsStarted = 0;
  const now = Date.now();
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) break;
    for (const u of data.users) {
      if (isAdminUser(u)) {
        adminIds.add(u.id);
        continue;
      }
      if (u.app_metadata?.va_paid === true) paying += 1;
      const ends = trialEndsAt(u.created_at);
      if (ends) {
        trialsStarted += 1;
        if (ends.getTime() > now && u.app_metadata?.va_paid !== true) onTrial += 1;
      }
    }
    if (data.users.length < 1000) break;
  }

  const notAdmin = (id: unknown) => !adminIds.has(id as string);
  const users = ((usersRes.data ?? []) as Row[]).filter((u) => notAdmin(u.id));
  const sellers = ((sellersRes.data ?? []) as Row[]).filter((s) => notAdmin(s.user_id));
  const adminSellerIds = new Set(
    ((sellersRes.data ?? []) as Row[]).filter((s) => !notAdmin(s.user_id)).map((s) => s.id as string)
  );
  const listings = ((listingsRes.data ?? []) as Row[]).filter((l) => !adminSellerIds.has(l.seller_id as string));
  const enquiries = ((enquiriesRes.data ?? []) as Row[]).filter((e) => notAdmin(e.buyer_id));
  const africanCountries = new Map(((countriesRes.data ?? []) as Row[]).map((c) => [c.id as string, c.name as string]));

  const inWindow = (r: Row) => typeof r.created_at === "string" && r.created_at >= sinceIso;
  const sellerIds = new Set(sellers.map((s) => s.id as string));
  const buyers = users.filter((u) => u.role === "buyer");
  const newUsers = users.filter(inWindow);
  const activeListings = listings.filter((l) => l.is_active !== false && sellerIds.has(l.seller_id as string));

  const listingsBySeller = tally(
    activeListings.map((l) => sellers.find((s) => s.id === l.seller_id)?.farm_name as string | undefined),
    8
  );

  return NextResponse.json(
    {
      range,
      rangeLabel: RANGES[range].label,
      days: windowMs / DAY,
      visits,
      app: {
        totals: {
          users: users.length,
          buyers: buyers.length,
          sellers: sellers.length,
          sellersPending: sellers.filter((s) => (s.verification_status ?? (s.is_verified ? "approved" : "pending")) === "pending").length,
          activeListings: activeListings.length,
          enquiries: enquiries.length,
          paying,
          onTrial,
          trialsStarted
        },
        period: {
          newUsers: newUsers.length,
          newBuyers: newUsers.filter((u) => u.role === "buyer").length,
          newSellers: sellers.filter(inWindow).length,
          newListings: listings.filter(inWindow).length,
          newEnquiries: enquiries.filter(inWindow).length
        },
        signupsDaily:
          windowMs <= DAY
            ? perSlot(newUsers.map((u) => u.created_at as string), windowMs)
            : perDay(newUsers.map((u) => u.created_at as string), windowMs / DAY),
        buyerCountries: tally(buyers.map((b) => countryByCode(b.country_code as string)?.name ?? (b.country_code as string | null)), 10),
        sellerCountries: tally(sellers.map((s) => africanCountries.get(s.african_country_id as string)), 10),
        listingCategories: tally(activeListings.map((l) => l.category as string), 10),
        listingsBySeller
      }
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
