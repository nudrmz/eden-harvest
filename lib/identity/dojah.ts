import "server-only";

/**
 * NIN lookups through Dojah (https://docs.dojah.io).
 *
 * Needs two environment variables, from Dojah → Developers → Configuration:
 *   DOJAH_APP_ID      the App ID
 *   DOJAH_SECRET_KEY  the secret key (test_sk_… in Sandbox, prod_sk_… in Live)
 *
 * Sandbox keys talk to sandbox.dojah.io (free, fake data; test NIN 70123456789).
 * Live keys talk to api.dojah.io and each lookup is charged to the Dojah wallet.
 * DOJAH_BASE_URL can override the address if ever needed.
 */

export type NinLookup =
  | {
      ok: true;
      sandbox: boolean;
      firstName: string;
      middleName: string;
      lastName: string;
      dateOfBirth: string | null;
      gender: string | null;
      /** Base64 JPEG from NIMC. Shown to the admin once; never stored. */
      photo: string | null;
    }
  | { ok: false; reason: "not_configured" | "invalid_nin" | "not_found" | "error"; message: string };

function config() {
  const appId = process.env.DOJAH_APP_ID?.trim();
  const secret = process.env.DOJAH_SECRET_KEY?.trim();
  if (!appId || !secret) return null;
  const sandbox = secret.startsWith("test_");
  const base =
    process.env.DOJAH_BASE_URL?.trim().replace(/\/$/, "") ||
    (sandbox ? "https://sandbox.dojah.io" : "https://api.dojah.io");
  return { appId, secret, sandbox, base };
}

export function isDojahConfigured(): boolean {
  return config() !== null;
}

export async function lookupNin(rawNin: string): Promise<NinLookup> {
  const cfg = config();
  if (!cfg) {
    return {
      ok: false,
      reason: "not_configured",
      message: "NIN checks aren't switched on yet. Add DOJAH_APP_ID and DOJAH_SECRET_KEY in Vercel."
    };
  }
  const nin = rawNin.replace(/\D/g, "");
  if (nin.length !== 11) {
    return { ok: false, reason: "invalid_nin", message: "A NIN is 11 digits. This one isn't, so it can't be checked." };
  }

  let res: Response;
  try {
    const url = new URL(`${cfg.base}/api/v1/kyc/nin`);
    url.searchParams.set("nin", nin);
    res = await fetch(url, {
      headers: { AppId: cfg.appId, Authorization: cfg.secret, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(25_000)
    });
  } catch (error) {
    console.error("dojah nin lookup: request failed:", error instanceof Error ? error.message : error);
    return { ok: false, reason: "error", message: "Couldn't reach Dojah. Try again in a minute." };
  }

  const body = (await res.json().catch(() => ({}))) as {
    entity?: Record<string, unknown>;
    error?: unknown;
    message?: unknown;
  };

  if (!res.ok || !body.entity) {
    const text = String(body.error ?? body.message ?? "");
    console.warn(`dojah nin lookup: ${res.status} ${text.slice(0, 200)}`);
    if (res.status === 404 || /not found|no record|invalid nin/i.test(text)) {
      return { ok: false, reason: "not_found", message: "NIMC has no record of this NIN." };
    }
    if (res.status === 401 || res.status === 403) {
      return { ok: false, reason: "error", message: "Dojah rejected the keys. Check DOJAH_APP_ID and DOJAH_SECRET_KEY in Vercel." };
    }
    if (res.status === 402 || /balance|fund|wallet/i.test(text)) {
      return { ok: false, reason: "error", message: "The Dojah wallet needs topping up before more checks can run." };
    }
    return { ok: false, reason: "error", message: text || `Dojah returned an error (${res.status}).` };
  }

  const e = body.entity;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  return {
    ok: true,
    sandbox: cfg.sandbox,
    firstName: str(e.first_name),
    middleName: str(e.middle_name),
    lastName: str(e.last_name),
    dateOfBirth: str(e.date_of_birth) || null,
    gender: str(e.gender) || null,
    photo: str(e.photo) || str(e.image) || null
  };
}

export type NameMatch = "match" | "partial" | "mismatch" | "unknown";

function tokens(name: string): string[] {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((t) => t.length > 1);
}

/**
 * Compares the name on the Eden Harvest account with the NIMC record.
 * match: every word of the account name is in the NIMC name (order ignored).
 * partial: at least one shared word, e.g. a nickname or a changed surname.
 */
export function compareNames(accountName: string | null | undefined, ninNames: string[]): NameMatch {
  const mine = tokens(accountName ?? "");
  if (mine.length === 0) return "unknown";
  const theirs = new Set(ninNames.flatMap(tokens));
  const shared = mine.filter((t) => theirs.has(t)).length;
  if (shared === mine.length && shared >= 2) return "match";
  if (shared > 0) return "partial";
  return "mismatch";
}
