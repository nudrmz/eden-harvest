import { NextRequest, NextResponse } from "next/server";
import { getStreamServerClient } from "@/lib/stream/server";
import { contactBlockedNotice, findContactInfo } from "@/lib/moderation/contactInfo";
import { canSendMessages } from "@/lib/access/server";

/**
 * Stream "before message send" hook: every new message passes through here
 * before it's saved or delivered. Messages with a phone number, email address
 * or WhatsApp/Telegram link are rejected, so the rule holds even if someone
 * sends through Stream's API directly rather than the Eden Harvest app.
 *
 * Registered automatically on production by ensureStreamHooks()
 * (lib/stream/setup.ts) as before_message_send_hook_url.
 *
 * It also stops buyers without Verified Access (trial or subscription
 * ended) from sending; sellers can always reply.
 *
 * Stream fails open: if this endpoint errors or is slow, the message goes
 * through. The same checks also run in the app before sending.
 */

interface BeforeSendPayload {
  message?: { text?: string; type?: string };
  user?: { id?: string; role?: string };
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 401 });
  }

  // Raw bytes, as with the event webhook: the payload may be gzipped.
  const rawBody = Buffer.from(await request.arrayBuffer());

  let payload: BeforeSendPayload;
  try {
    payload = getStreamServerClient().verifyAndParseWebhook(
      rawBody,
      signature
    ) as BeforeSendPayload;
  } catch (error) {
    console.error("before-send hook rejected:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const text = payload.message?.text;
  const isAdmin = payload.user?.role === "admin";
  const found = isAdmin ? null : findContactInfo(text);

  if (found) {
    return NextResponse.json({
      message: { type: "error", text: contactBlockedNotice(found.kind) }
    });
  }

  // Buyers whose trial or subscription has ended can read but not send.
  const userId = payload.user?.id;
  if (!isAdmin && userId && !(await canSendMessages(userId))) {
    return NextResponse.json({
      message: {
        type: "error",
        text: "Your free trial or subscription has ended. Subscribe to Verified Access to keep messaging sellers."
      }
    });
  }

  // Unchanged: echo the text back as-is.
  return NextResponse.json({ message: text === undefined ? {} : { text } });
}
