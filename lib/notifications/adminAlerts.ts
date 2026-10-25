import "server-only";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { setAppMetadata } from "@/lib/access/server";
import { siteUrl } from "@/lib/site";

/**
 * Emails the Eden Harvest team when someone signs up, and again when a seller
 * submits their farm for approval.
 *
 * Several places call notifyAdminOfSignup (the sign-up form, the email
 * confirmation / Google callback, and the first app load) because no single
 * one sees every new account. A flag in app_metadata makes sure each account
 * is only announced once.
 */

const DEFAULT_FROM = "Eden Harvest <notifications@edenharvest.app>";
const DEFAULT_TO = "admin@edenharvest.app";
const FLAG = "admin_signup_alert_sent";

/** Accounts created before this were never announced and never will be. */
export const SIGNUP_ALERTS_FROM = "2026-10-25T19:00:00Z";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function londonTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London"
  });
}

async function sendAdminEmail(subject: string, heading: string, rows: [string, string][], button: { label: string; href: string }): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set, skipping admin alert:", subject);
    return false;
  }

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 0;color:#6b7a72;font-size:14px;width:40%;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:6px 0;font-size:14px;color:#1f2a24;">${escapeHtml(value)}</td></tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f5f2;font-family:Arial,Helvetica,sans-serif;color:#1f2a24;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f2;padding:24px 16px;"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;">
      <tr><td style="background:#0f2a1e;padding:18px 24px;">
        <p style="margin:0;font-size:13px;color:#9fe0c4;letter-spacing:0.5px;">EDEN HARVEST · ADMIN</p>
        <p style="margin:6px 0 0;font-size:19px;font-weight:bold;color:#ffffff;">${escapeHtml(heading)}</p>
      </td></tr>
      <tr><td style="padding:18px 24px 6px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${tableRows}</table></td></tr>
      <tr><td style="padding:12px 24px 24px;">
        <a href="${button.href}" style="display:inline-block;background:#1D9E75;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;padding:12px 24px;border-radius:10px;">${escapeHtml(button.label)}</a>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  const text = [heading, "", ...rows.map(([l, v]) => `${l}: ${v}`), "", `${button.label}: ${button.href}`].join("\n");

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from: process.env.NOTIFICATIONS_FROM_EMAIL?.trim() || DEFAULT_FROM,
      to: process.env.ADMIN_ALERT_EMAIL?.trim() || DEFAULT_TO,
      subject,
      text,
      html
    });
    if (error) {
      console.error("admin alert send failed:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("admin alert send threw:", error);
    return false;
  }
}

/**
 * Announce a new account, once. Safe to call as often as you like.
 * `maxAgeMs` limits it to recently created accounts (used by the public
 * sign-up form endpoint so it can't be used to probe old accounts).
 */
export async function notifyAdminOfSignup(userId: string, opts: { maxAgeMs?: number } = {}): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  try {
    const { data, error } = await admin.auth.admin.getUserById(userId);
    const user = data?.user;
    if (error || !user) return;

    const meta = user.app_metadata ?? {};
    if (meta[FLAG] === true) return;

    const created = new Date(user.created_at).getTime();
    if (!Number.isFinite(created) || created < new Date(SIGNUP_ALERTS_FROM).getTime()) {
      // Older account: never announce it, and mark it so app loads stop checking.
      if (opts.maxAgeMs === undefined) await setAppMetadata(userId, { [FLAG]: true }, meta);
      return;
    }
    if (opts.maxAgeMs !== undefined && Date.now() - created > opts.maxAgeMs) return;

    // Claim it first so two callers at the same moment don't both send.
    if (!(await setAppMetadata(userId, { [FLAG]: true }, meta))) return;

    const { data: profile } = await admin
      .from("users")
      .select("full_name, role, country_code")
      .eq("id", userId)
      .maybeSingle();

    const userMeta = user.user_metadata ?? {};
    const provider = (meta.provider as string | undefined) ?? "email";
    const viaGoogle = provider === "google";
    const chosenRole = (userMeta.role as string | undefined) ?? (profile?.role as string | undefined);
    const isSeller = chosenRole === "seller";
    const name =
      (profile?.full_name as string | null) ||
      (userMeta.full_name as string | undefined) ||
      (userMeta.name as string | undefined) ||
      "—";
    const roleLabel = isSeller ? "SELLER" : "BUYER";

    const rows: [string, string][] = [
      ["Type", isSeller ? "Seller (farm)" : viaGoogle ? "Buyer (Google sign-ups start as buyers)" : "Buyer"],
      ["Name", name],
      ["Email", user.email ?? "—"],
      ["Country", (profile?.country_code as string | null) || (userMeta.country_code as string | undefined) || "—"],
      ["Signed up with", viaGoogle ? "Google" : "Email & password"],
      ["Email confirmed", user.email_confirmed_at ? "Yes" : "Not yet"],
      ["Signed up", londonTime(user.created_at)]
    ];
    const source = userMeta.signup_source as string | undefined;
    if (source) rows.push(["Came from", source]);
    if (isSeller) rows.push(["Next step", "They'll appear in Seller verification once they finish farm set-up."]);

    const sent = await sendAdminEmail(
      `New ${roleLabel} sign-up: ${name !== "—" ? name : user.email ?? "new account"}`,
      `New ${isSeller ? "seller" : "buyer"} signed up`,
      rows,
      {
        label: "Look up this user",
        href: `${siteUrl()}/admin/users?email=${encodeURIComponent(user.email ?? "")}`
      }
    );
    // Let a later call try again if the email didn't go.
    if (!sent) await setAppMetadata(userId, { [FLAG]: false });
  } catch (error) {
    console.error("notifyAdminOfSignup failed:", error);
  }
}

/** A seller has finished the 5-step set-up and is waiting for approval. */
export async function notifyAdminOfSellerApplication(params: {
  email: string | null | undefined;
  farmName: string;
  country: string;
  stateRegion: string;
  localArea?: string | null;
  categories?: string[];
  documentType: string;
}): Promise<void> {
  const rows: [string, string][] = [
    ["Farm", params.farmName],
    ["Email", params.email ?? "—"],
    ["Location", [params.localArea, params.stateRegion, params.country].filter(Boolean).join(", ")],
    ["Verified with", params.documentType]
  ];
  if (params.categories?.length) rows.push(["Sells", params.categories.join(", ")]);

  await sendAdminEmail(
    `New SELLER application: ${params.farmName}`,
    "Seller waiting for approval",
    rows,
    { label: "Review in Seller verification", href: `${siteUrl()}/admin/verifications` }
  );
}
