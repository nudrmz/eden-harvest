import "server-only";
import { Resend } from "resend";

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
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://eden-harvest.vercel.app").replace(
    /\/$/,
    ""
  );
  return `${base}/messages?channel=${encodeURIComponent(channelId)}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface NewMessageEmail {
  to: string;
  recipientName: string | null;
  senderName: string;
  /** Message body. Omitted for digests where we only know a count. */
  preview?: string | null;
  channelId: string;
  unreadCount?: number;
}

/**
 * Notify someone who was offline when a message arrived. Returns false when
 * email isn't configured so callers can still ack the webhook — a missing
 * RESEND_API_KEY should degrade to "no email", not a failed delivery that
 * Stream keeps retrying.
 */
export async function sendNewMessageEmail(params: NewMessageEmail): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping message notification email.");
    return false;
  }

  const greeting = params.recipientName?.trim()
    ? `Hi ${params.recipientName.trim().split(" ")[0]},`
    : "Hi,";
  const link = messagesUrl(params.channelId);
  const subject =
    params.unreadCount && params.unreadCount > 1
      ? `${params.senderName} sent you ${params.unreadCount} messages on Eden Harvest`
      : `New message from ${params.senderName} on Eden Harvest`;

  const previewBlock = params.preview?.trim()
    ? `<blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #1D9E75;background:#f4faf7;color:#1A1A18;">${escapeHtml(
        params.preview.trim()
      )}</blockquote>`
    : "";

  try {
    const { error } = await resend.emails.send({
      from: process.env.NOTIFICATIONS_FROM_EMAIL?.trim() || DEFAULT_FROM,
      to: params.to,
      subject,
      text: [
        greeting,
        "",
        `${params.senderName} messaged you on Eden Harvest.`,
        params.preview?.trim() ? `"${params.preview.trim()}"` : "",
        "",
        `Reply here: ${link}`
      ]
        .filter(Boolean)
        .join("\n"),
      html: `
        <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:480px;color:#1A1A18;">
          <p>${greeting}</p>
          <p><strong>${escapeHtml(params.senderName)}</strong> messaged you on Eden Harvest.</p>
          ${previewBlock}
          <p>
            <a href="${link}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#1D9E75;color:#ffffff;text-decoration:none;font-weight:600;">
              Read and reply
            </a>
          </p>
          <p style="color:#6b6b66;font-size:12px;">
            You're receiving this because you have an Eden Harvest account.
          </p>
        </div>
      `
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
