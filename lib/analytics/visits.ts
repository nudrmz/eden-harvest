import "server-only";

/**
 * Visitor numbers from Vercel Web Analytics (cookie-free page-view counts).
 *
 * Needs two things set up once in Vercel:
 *  1. Web Analytics enabled on the project (Project → Analytics → Enable).
 *  2. An access token in the VERCEL_ANALYTICS_TOKEN environment variable
 *     (Account settings → Tokens). It's only used here, on the server.
 *
 * Without them the admin page still works and shows how to switch this on.
 */

const API = "https://api.vercel.com/v1/query/web-analytics/visits";
// Not secrets: identify the Eden Harvest project and team. Env vars win if set.
const PROJECT_ID = process.env.VERCEL_ANALYTICS_PROJECT_ID || process.env.VERCEL_PROJECT_ID || "prj_Mfd222mWP0aRp2jqgyE5J9cO13Hm";
const TEAM_ID = process.env.VERCEL_ANALYTICS_TEAM_ID || "team_CMtT500vHg7GjhWm62BUBtev";

export type VisitStatus = "ok" | "no_token" | "not_enabled" | "error";

export interface Breakdown {
  label: string;
  count: number;
}

export interface VisitStats {
  status: VisitStatus;
  message?: string;
  pageviews: number;
  visitors: number;
  daily: Breakdown[];
  countries: Breakdown[];
  referrers: Breakdown[];
  devices: Breakdown[];
  pages: Breakdown[];
  utmSources: Breakdown[];
}

const EMPTY: Omit<VisitStats, "status"> = {
  pageviews: 0,
  visitors: 0,
  daily: [],
  countries: [],
  referrers: [],
  devices: [],
  pages: [],
  utmSources: []
};

class AnalyticsError extends Error {
  constructor(public status: VisitStatus, message: string) {
    super(message);
  }
}

async function call(path: "count" | "aggregate", params: Record<string, string | string[]>, token: string) {
  const url = new URL(`${API}/${path}`);
  url.searchParams.set("projectId", PROJECT_ID);
  url.searchParams.set("teamId", TEAM_ID);
  for (const [key, value] of Object.entries(params)) {
    for (const v of Array.isArray(value) ? value : [value]) url.searchParams.append(key, v);
  }
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
  });
  const body = (await res.json().catch(() => ({}))) as {
    data?: unknown;
    error?: { code?: string; message?: string };
  };
  if (!res.ok) {
    const code = body.error?.code ?? "";
    if (code.includes("not_enabled")) throw new AnalyticsError("not_enabled", "Web Analytics is not enabled yet.");
    throw new AnalyticsError("error", body.error?.message || `Vercel returned ${res.status}.`);
  }
  return body.data;
}

/** The count in an aggregate row, whatever Vercel calls it. */
function countOf(row: Record<string, unknown>): number {
  for (const key of ["pageviews", "visitors", "count", "total", "value"]) {
    const v = row[key];
    if (typeof v === "number") return v;
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  }
  return 0;
}

/**
 * One breakdown. Some dimensions (e.g. UTM on the Hobby plan) need a paid
 * add-on; if Vercel refuses one, that section is just left empty.
 */
async function breakdown(by: string, since: string, until: string, token: string, limit = 8): Promise<Breakdown[]> {
  let data: unknown;
  try {
    data = await call("aggregate", { by, since, until, limit: String(limit) }, token);
  } catch (error) {
    if (error instanceof AnalyticsError && error.status === "not_enabled") throw error;
    console.warn(`[analytics] ${by} breakdown unavailable:`, error instanceof Error ? error.message : error);
    return [];
  }
  if (!Array.isArray(data)) return [];
  return (data as Record<string, unknown>[])
    .map((row) => ({
      label: String(row[by] ?? row.timestamp ?? "").trim() || "Unknown",
      count: countOf(row)
    }))
    .filter((r) => r.count > 0 || by === "day" || by === "hour");
}

/** windowMs: how far back to look. Short windows are charted by hour instead of by day. */
export async function getVisitStats(windowMs: number): Promise<VisitStats> {
  const token = process.env.VERCEL_ANALYTICS_TOKEN?.trim();
  if (!token) return { status: "no_token", ...EMPTY };

  const until = new Date();
  const since = new Date(until.getTime() - windowMs);
  const byHour = windowMs <= 2 * 24 * 60 * 60 * 1000;
  const s = since.toISOString();
  const u = until.toISOString();

  try {
    const [totals, daily, countries, referrers, devices, pages, utmSources] = await Promise.all([
      call("count", { since: s, until: u }, token),
      breakdown(byHour ? "hour" : "day", s, u, token, 100),
      breakdown("country", s, u, token),
      breakdown("referrerHostname", s, u, token),
      breakdown("deviceType", s, u, token, 5),
      breakdown("requestPath", s, u, token),
      breakdown("utmSource", s, u, token)
    ]);
    const t = (totals ?? {}) as Record<string, unknown>;
    return {
      status: "ok",
      pageviews: countOf({ pageviews: t.pageviews }),
      visitors: countOf({ visitors: t.visitors }),
      daily: byHour ? daily : daily.map((d) => ({ ...d, label: d.label.slice(0, 10) })),
      countries,
      referrers,
      devices,
      pages,
      utmSources: utmSources.filter((r) => r.label !== "Unknown")
    };
  } catch (error) {
    if (error instanceof AnalyticsError) return { status: error.status, message: error.message, ...EMPTY };
    return { status: "error", message: error instanceof Error ? error.message : "Unknown error", ...EMPTY };
  }
}
