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

const DAY = 24 * 60 * 60 * 1000;

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

  const daysParam = Number(request.nextUrl.searchParams.get("days"));
  const days = [7, 30, 90].includes(daysParam) ? daysParam : 30;
  const sinceIso = new Date(Date.now() - days * DAY).toISOString();

  const [visits, usersRes, listingsRes, enquiriesRes, sellersRes, countriesRes] = await Promise.all([
    getVisitStats(days),
    admin.from("users").select("id, role, country_code, created_at"),
    admin.from("listings").select("id, category, is_active, created_at, seller_id"),
    admin.from("enquiries").select("id, created_at"),
    admin.from("seller_profiles").select("id, farm_name, african_country_id, is_verified, verification_status, created_at"),
    admin.from("african_countries").select("id, name")
  ]);

  const users = (usersRes.data ?? []) as Row[];
  const listings = (listingsRes.data ?? []) as Row[];
  const enquiries = (enquiriesRes.data ?? []) as Row[];
  const sellers = (sellersRes.data ?? []) as Row[];
  const africanCountries = new Map(((countriesRes.data ?? []) as Row[]).map((c) => [c.id as string, c.name as string]));

  // Subscriptions and trials live on the sign-in accounts.
  let paying = 0;
  let onTrial = 0;
  let trialsStarted = 0;
  const now = Date.now();
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) break;
    for (const u of data.users) {
      if (u.app_metadata?.va_paid === true) paying += 1;
      const ends = trialEndsAt(u.created_at);
      if (ends) {
        trialsStarted += 1;
        if (ends.getTime() > now && u.app_metadata?.va_paid !== true) onTrial += 1;
      }
    }
    if (data.users.length < 1000) break;
  }

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
      days,
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
        signupsDaily: perDay(newUsers.map((u) => u.created_at as string), days),
        buyerCountries: tally(buyers.map((b) => countryByCode(b.country_code as string)?.name ?? (b.country_code as string | null)), 10),
        sellerCountries: tally(sellers.map((s) => africanCountries.get(s.african_country_id as string)), 10),
        listingCategories: tally(activeListings.map((l) => l.category as string), 10),
        listingsBySeller
      }
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
