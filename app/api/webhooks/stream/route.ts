import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStreamServerClient } from "@/lib/stream/server";
import { sendNewMessageEmail } from "@/lib/notifications/email";
import { readNotificationPrefs } from "@/lib/notifications/prefs";
import { CONTACT_HIDDEN_TEXT, findContactInfo } from "@/lib/moderation/contactInfo";

/**
 * Stream event hook. Emails anyone who was offline when a message arrived, so
 * sellers don't have to sit in the app to notice an enquiry.
 *
 * Setup (Stream dashboard → your app → Event hooks, or updateAppSettings):
 *   webhook_url: https://edenharvest.app/api/webhooks/stream
 *   event_types: ["message.new", "message.updated", "user.unread_message_reminder"]
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
  channel_type?: string;
  message?: { id?: string; text?: string; user?: { id?: string; name?: string; role?: string } };
  user?: { id?: string; name?: string };
  members?: WebhookMember[];
  channels?: Record<string, ReminderChannel>;
}

interface Recipient {
  id: string;
  email: string;
  fullName: string | null;
}

/**
 * Stream only knows ids and display names, so emails come from our own users
 * table. Anyone who has turned off message emails (Settings, or the link in an
 * email) is left out.
 */
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

  const rows = (data ?? []).filter(
    (row): row is { id: string; email: string; full_name: string | null } => Boolean(row.email)
  );

  const wanted = await Promise.all(
    rows.map(async (row) => {
      const { data: authUser, error: authError } = await admin.auth.admin.getUserById(row.id);
      if (authError || !authUser.user) return false;
      return readNotificationPrefs(authUser.user.user_metadata).enquiries;
    })
  );

  return rows
    .filter((_, i) => wanted[i])
    .map((row) => ({ id: row.id, email: row.email, fullName: row.full_name }));
}

/**
 * One email per conversation until it's read: only email when this message is
 * the recipient's first unread one in the channel. Later messages in the same
 * unread run would just repeat the first email. If Stream can't tell us, send.
 */
async function firstUnreadRecipients(
  channelType: string,
  channelId: string,
  userIds: string[]
): Promise<string[]> {
  if (userIds.length === 0) return [];
  try {
    const channel = getStreamServerClient().channel(channelType, channelId);
    const state = await channel.query({ state: true, messages: { limit: 1 } });
    const unread = new Map(
      (state.read ?? []).map((r) => [r.user?.id, r.unread_messages ?? 0] as const)
    );
    return userIds.filter((id) => (unread.get(id) ?? 1) <= 1);
  } catch (error) {
    console.error("unread check failed, emailing anyway:", error);
    return userIds;
  }
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
  const offline = offlineMemberIds(event.members ?? [], senderId);
  const targets = await firstUnreadRecipients(event.channel_type ?? "messaging", channelId, offline);
  const recipients = await lookupRecipients(targets);

  let sent = 0;
  for (const recipient of recipients) {
    const ok = await sendNewMessageEmail({
      to: recipient.email,
      recipientId: recipient.id,
      recipientName: recipient.fullName,
      senderName,
      // Never put contact details in an email, even if a message slipped through.
      preview: findContactInfo(event.message?.text) ? null : (event.message?.text ?? null),
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
      recipientId: recipient.id,
      recipientName: recipient.fullName,
      senderName,
      preview: findContactInfo(latest?.text) ? null : (latest?.text ?? null),
      channelId,
      unreadCount: messages.length
    });
    if (ok) sent += 1;
  }
  return sent;
}

/**
 * New messages are checked for contact details before they're sent (see
 * ./before-send). Edits don't go through that hook, so an edited message that
 * adds a phone number or email is hidden here instead.
 */
async function handleUpdatedMessage(event: StreamWebhookEvent): Promise<void> {
  const message = event.message;
  const authorId = message?.user?.id;
  if (!message?.id || !authorId || message.user?.role === "admin") return;
  if (!findContactInfo(message.text)) return;

  await getStreamServerClient().partialUpdateMessage(
    message.id,
    { set: { text: CONTACT_HIDDEN_TEXT } },
    authorId
  );
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 401 });
  }

  // Must be the raw bytes: Stream may gzip the payload, and decoding it as
  // text first would corrupt it (and fail the signature check). The SDK
  // detects and decompresses gzip itself.
  const rawBody = Buffer.from(await request.arrayBuffer());

  let event: StreamWebhookEvent;
  try {
    event = getStreamServerClient().verifyAndParseWebhook(
      rawBody,
      signature
    ) as StreamWebhookEvent;
  } catch (error) {
    console.error(
      "Stream webhook rejected:",
      error instanceof Error ? error.message : error,
      { bytes: rawBody.length, encoding: request.headers.get("content-encoding") }
    );
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  try {
    let sent = 0;
    if (event.type === "message.new") {
      sent = await handleNewMessage(event);
    } else if (event.type === "message.updated") {
      await handleUpdatedMessage(event);
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
