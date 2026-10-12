import "server-only";
import { Resend } from "resend";
import { siteUrl } from "@/lib/site";
import { unsubscribeUrl } from "@/lib/notifications/unsubscribe";

const DEFAULT_FROM = "Eden Harvest <notifications@edenharvest.app>";

let cached: Resend | null = null;

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function getResend(): Resend | null {
  if (cached) return cached;

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;

  cached = new Resend(apiKey);
  return cached;
}

function messagesUrl(channelId: string): string {
  return `${siteUrl()}/messages?channel=${encodeURIComponent(channelId)}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Keep previews short: the point is to bring them back to the app. */
function shorten(text: string, max = 280): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export interface NewMessageEmail {
  to: string;
  /** Used to sign the unsubscribe link. */
  recipientId: string;
  recipientName: string | null;
  senderName: string;
  /** Message body. Omitted for digests where we only know a count. */
  preview?: string | null;
  channelId: string;
  unreadCount?: number;
}

/**
 * Notify someone who was away when a message arrived. Returns false when
 * email isn't configured so callers can still ack the webhook: a missing
 * RESEND_API_KEY should mean "no email", not a failed delivery that Stream
 * keeps retrying.
 */
export async function sendNewMessageEmail(params: NewMessageEmail): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY not set, skipping message notification email.");
    return false;
  }

  const site = siteUrl();
  const firstName = params.recipientName?.trim().split(" ")[0];
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";
  const link = messagesUrl(params.channelId);
  const optOut = unsubscribeUrl(params.recipientId);
  const sender = params.senderName.trim() || "Someone";
  const preview = params.preview?.trim() ? shorten(params.preview) : "";
  const many = Boolean(params.unreadCount && params.unreadCount > 1);
  const subject = many
    ? `${sender} sent you ${params.unreadCount} messages on Eden Harvest`
    : `New message from ${sender} on Eden Harvest`;
  const intro = many
    ? `<strong>${escapeHtml(sender)}</strong> sent you ${params.unreadCount} messages on Eden Harvest.`
    : `<strong>${escapeHtml(sender)}</strong> sent you a message on Eden Harvest.`;

  const previewBlock = preview
    ? `<tr><td style="padding:0 32px 8px;">
         <div style="margin:4px 0 8px;padding:14px 16px;border-left:3px solid #1D9E75;background:#f4faf7;border-radius:0 10px 10px 0;font-size:15px;line-height:1.55;color:#1f2a24;">${escapeHtml(preview)}</div>
       </td></tr>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f5f2;font-family:Arial,Helvetica,sans-serif;color:#1f2a24;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f2;padding:32px 16px;"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;">
      <tr><td align="center" style="background:#0f2a1e;padding:24px;">
        <img src="${site}/icons/icon-192.png" width="56" height="56" alt="Eden Harvest" style="display:block;border:0;border-radius:50%;" />
        <p style="margin:10px 0 0;font-size:17px;font-weight:bold;color:#ffffff;letter-spacing:0.5px;">Eden Harvest</p>
      </td></tr>
      <tr><td style="padding:28px 32px 8px;">
        <p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:#3d4a43;">${escapeHtml(greeting)}</p>
        <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#3d4a43;">${intro}</p>
      </td></tr>
      ${previewBlock}
      <tr><td align="center" style="padding:12px 32px 28px;">
        <a href="${link}" style="display:inline-block;background:#1D9E75;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;padding:14px 32px;border-radius:12px;">Read and reply</a>
      </td></tr>
      <tr><td align="center" style="background:#f7f9f6;padding:18px 24px;border-top:1px solid #e6ebe6;">
        <p style="margin:0;font-size:12px;line-height:1.6;color:#8a968f;">
          You're getting this because you have an Eden Harvest account and weren't online when the message arrived.<br />
          <a href="${optOut}" style="color:#1D9E75;text-decoration:none;">Turn off message emails</a> ·
          <a href="${site}/settings#notifications" style="color:#1D9E75;text-decoration:none;">Notification settings</a>
        </p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  const text = [
    greeting,
    "",
    many
      ? `${sender} sent you ${params.unreadCount} messages on Eden Harvest.`
      : `${sender} sent you a message on Eden Harvest.`,
    preview ? `"${preview}"` : "",
    "",
    `Read and reply: ${link}`,
    "",
    `Turn off message emails: ${optOut}`
  ]
    .filter((line, i, all) => line !== "" || all[i - 1] !== "")
    .join("\n");

  try {
    const { error } = await resend.emails.send({
      from: process.env.NOTIFICATIONS_FROM_EMAIL?.trim() || DEFAULT_FROM,
      to: params.to,
      subject,
      text,
      html,
      headers: {
        // One-click unsubscribe (RFC 8058): Gmail and Outlook show their own
        // "Unsubscribe" button, and it counts towards sender reputation.
        "List-Unsubscribe": `<${optOut}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
      }
    });

    if (error) {
      console.error("Resend send failed:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Resend send threw:", error);
    return false;
  }
}
