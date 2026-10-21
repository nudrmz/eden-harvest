import "server-only";
import { Resend } from "resend";
import { siteUrl } from "@/lib/site";
import { formatTrialEnd, trialDaysLeft } from "@/lib/access/trial";

const DEFAULT_FROM = "Eden Harvest <notifications@edenharvest.app>";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** "Your free trial ends in 3 days", sent once, a few days before the end. */
export async function sendTrialEndingEmail(params: {
  to: string;
  name: string | null;
  trialEndsAt: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set, skipping trial reminder email.");
    return false;
  }

  const site = siteUrl();
  const firstName = params.name?.trim().split(" ")[0];
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";
  const days = Math.max(1, trialDaysLeft(params.trialEndsAt));
  const when = formatTrialEnd(params.trialEndsAt);
  const subject = `Your Eden Harvest free trial ends in ${days} ${days === 1 ? "day" : "days"}`;
  const link = `${site}/upgrade`;

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f5f2;font-family:Arial,Helvetica,sans-serif;color:#1f2a24;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f2;padding:32px 16px;"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;">
      <tr><td align="center" style="background:#0f2a1e;padding:24px;">
        <img src="${site}/icons/icon-192.png" width="56" height="56" alt="Eden Harvest" style="display:block;border:0;border-radius:50%;" />
        <p style="margin:10px 0 0;font-size:17px;font-weight:bold;color:#ffffff;letter-spacing:0.5px;">Eden Harvest</p>
      </td></tr>
      <tr><td style="padding:28px 32px 8px;font-size:15px;line-height:1.6;color:#3d4a43;">
        <p style="margin:0 0 10px;">${escapeHtml(greeting)}</p>
        <p style="margin:0 0 10px;">Your free trial of <strong>Verified Access</strong> ends on <strong>${escapeHtml(when)}</strong>.</p>
        <p style="margin:0 0 10px;">To keep messaging farmers directly and seeing every seller&rsquo;s reviews, subscribe before then. Your conversations stay where they are.</p>
      </td></tr>
      <tr><td align="center" style="padding:12px 32px 28px;">
        <a href="${link}" style="display:inline-block;background:#1D9E75;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;padding:14px 32px;border-radius:12px;">Keep Verified Access</a>
      </td></tr>
      <tr><td align="center" style="background:#f7f9f6;padding:18px 24px;border-top:1px solid #e6ebe6;">
        <p style="margin:0;font-size:12px;line-height:1.6;color:#8a968f;">
          You&rsquo;re getting this one-off reminder because you started a free trial on Eden Harvest.<br />
          Questions? <a href="mailto:support@edenharvest.app" style="color:#1D9E75;text-decoration:none;">support@edenharvest.app</a>
        </p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  const text = [
    greeting,
    "",
    `Your free trial of Verified Access ends on ${when}.`,
    "To keep messaging farmers directly and seeing every seller's reviews, subscribe before then.",
    "",
    `Keep Verified Access: ${link}`,
    "",
    "Questions? support@edenharvest.app"
  ].join("\n");

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from: process.env.NOTIFICATIONS_FROM_EMAIL?.trim() || DEFAULT_FROM,
      to: params.to,
      subject,
      text,
      html
    });
    if (error) {
      console.error("trial reminder send failed:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("trial reminder send threw:", error);
    return false;
  }
}
