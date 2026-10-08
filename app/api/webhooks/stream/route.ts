import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStreamServerClient } from "@/lib/stream/server";
import { sendNewMessageEmail } from "@/lib/notifications/email";

/**
 * Stream event hook. Emails anyone who was offline when a message arrived, so
 * sellers don't have to sit in the app to notice an enquiry.
 *
 * Setup (Stream dashboard → your app → Event hooks, or updateAppSettings):
 *   webhook_url: https://edenharvest.app/api/webhooks/stream
 *   event_types: ["message.new", "user.unread_message_reminder"]
 *
 * message.new fires immediately; user.unread_message_reminder (enable "unread
 * reminders" in Stream) fires only after a message sits unread for the
 * configured interval, which is quieter for a busy back-and-forth thread.
 */

/** Webhook payloads carry fields the client-side Event type doesn't model. */
interface WebhookMember {
  user?: { id?: string; name?: string; online?: boolean };
  user_id?: string;
}

interface ReminderChannel {
  channel?: { id?: string; members?: WebhookMember[] };
  messages?: { text?: string; user?: { id?: string } }[];
}

interface StreamWebhookEvent {
  type?: string;
  channel_id?: string;
  message?: { text?: string; user?: { id?: string; name?: string } };
  user?: { id?: string; name?: string };
  members?: WebhookMember[];
  channels?: Record<string, ReminderChannel>;
}

interface Recipient {
  id: string;
  email: string;
  fullName: string | null;
}

/** Stream only knows ids and display names, so emails come from our own users table. */
async function lookupRecipients(userIds: string[]): Promise<Recipient[]> {
  if (userIds.length === 0) return [];

  const admin = createAdminClient();
  if (!admin) {
    console.error("Supabase admin client unavailable — cannot resolve notification emails.");
    return [];
  }

  const { data, error } = await admin
    .from("users")
    .select("id, email, full_name")
    .in("id", userIds);

  if (error) {
    console.error("recipient lookup failed:", error.message);
    return [];
  }

  return (data ?? [])
    .filter((row): row is { id: string; email: string; full_name: string | null } =>
      Boolean(row.email)
    )
    .map((row) => ({ id: row.id, email: row.email, fullName: row.full_name }));
}

function offlineMemberIds(members: WebhookMember[], senderId: string | undefined): string[] {
  const ids = new Set<string>();
  for (const member of members) {
    const id = member.user?.id ?? member.user_id;
    if (!id || id === senderId) continue;
    // Stream omits `online` for users who have never connected — treat as offline.
    if (member.user?.online === true) continue;
    ids.add(id);
  }
  return [...ids];
}

async function handleNewMessage(event: StreamWebhookEvent): Promise<number> {
  const channelId = event.channel_id;
  if (!channelId) return 0;

  const senderId = event.message?.user?.id ?? event.user?.id;
  const senderName = event.message?.user?.name ?? event.user?.name ?? "Someone";
  const targets = offlineMemberIds(event.members ?? [], senderId);
  const recipients = await lookupRecipients(targets);

  let sent = 0;
  for (const recipient of recipients) {
    const ok = await sendNewMessageEmail({
      to: recipient.email,
      recipientName: recipient.fullName,
      senderName,
      preview: event.message?.text ?? null,
      channelId
    });
    if (ok) sent += 1;
  }
  return sent;
}

async function handleUnreadReminder(event: StreamWebhookEvent): Promise<number> {
  const recipientId = event.user?.id;
  if (!recipientId || !event.channels) return 0;

  const [recipient] = await lookupRecipients([recipientId]);
  if (!recipient) return 0;

  let sent = 0;
  for (const entry of Object.values(event.channels)) {
    const channelId = entry.channel?.id;
    if (!channelId) continue;

    const messages = entry.messages ?? [];
    const latest = messages[messages.length - 1];
    const senderId = latest?.user?.id;
    const senderName =
      (entry.channel?.members ?? []).find(
        (member) => (member.user?.id ?? member.user_id) === senderId
      )?.user?.name ?? "Someone";

    const ok = await sendNewMessageEmail({
      to: recipient.email,
      recipientName: recipient.fullName,
      senderName,
      preview: latest?.text ?? null,
      channelId,
      unreadCount: messages.length
    });
    if (ok) sent += 1;
  }
  return sent;
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 401 });
  }

  // Must be the raw body — any re-serialisation changes the bytes Stream signed.
  const rawBody = await request.text();

  let event: StreamWebhookEvent;
  try {
    event = getStreamServerClient().verifyAndParseWebhook(
      rawBody,
      signature
    ) as StreamWebhookEvent;
  } catch (error) {
    console.error("Stream webhook rejected:", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  try {
    let sent = 0;
    if (event.type === "message.new") {
      sent = await handleNewMessage(event);
    } else if (event.type === "user.unread_message_reminder") {
      sent = await handleUnreadReminder(event);
    }

    return NextResponse.json({ received: true, notified: sent });
  } catch (error) {
    // Ack anyway: a retry won't fix a bad address or a missing API key, and
    // Stream would otherwise redeliver this event repeatedly.
    console.error("Stream webhook handling failed:", error);
    return NextResponse.json({ received: true, notified: 0 });
  }
}
