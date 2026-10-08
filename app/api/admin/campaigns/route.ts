import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/auth/admin";
import { CAMPAIGN_LINKS } from "@/lib/campaigns";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

interface Tally {
  total: number;
  buyers: number;
  sellers: number;
  last30: number;
}

const empty = (): Tally => ({ total: 0, buyers: 0, sellers: 0, last30: 0 });

async function allUsers(admin: NonNullable<ReturnType<typeof createAdminClient>>) {
  const users: User[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return users;
}

/** Short links plus how many sign-ups each one brought in (first touch). */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Server admin client is not configured (SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 500 }
    );
  }

  let users: User[];
  try {
    users = await allUsers(admin);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not list users." },
      { status: 500 }
    );
  }

  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const byCampaign = new Map<string, Tally>();
  const untracked = empty();

  for (const u of users) {
    const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
    const key =
      (typeof meta.signup_campaign === "string" && meta.signup_campaign) ||
      (typeof meta.signup_source === "string" && `source:${meta.signup_source}`) ||
      null;
    const tally = key ? byCampaign.get(key) ?? empty() : untracked;
    tally.total += 1;
    if (meta.role === "seller") tally.sellers += 1;
    else tally.buyers += 1;
    if (new Date(u.created_at).getTime() >= cutoff) tally.last30 += 1;
    if (key) byCampaign.set(key, tally);
  }

  const base = siteUrl();
  const links = CAMPAIGN_LINKS.map((link) => ({
    ...link,
    url: `${base}/${link.slug}`,
    signups: byCampaign.get(link.slug) ?? empty()
  }));
  const known = new Set(CAMPAIGN_LINKS.map((l) => l.slug));
  const other = [...byCampaign.entries()]
    .filter(([key]) => !known.has(key))
    .map(([key, signups]) => ({ key, signups }));

  return NextResponse.json({ links, other, untracked, totalUsers: users.length });
}
