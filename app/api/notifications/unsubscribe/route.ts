import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUnsubscribeToken } from "@/lib/notifications/unsubscribe";
import { NOTIFICATION_PREFS_METADATA_KEY, readNotificationPrefs } from "@/lib/notifications/prefs";

/**
 * Turn off message emails from a link in the email, no sign-in needed.
 * GET shows a confirm button (link scanners prefetch GETs, so they mustn't
 * unsubscribe anyone); POST does it, which is also what Gmail and Outlook's
 * one-click "Unsubscribe" sends.
 */

function page(title: string, body: string, status = 200): NextResponse {
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="robots" content="noindex" />
<title>${title} · Eden Harvest</title></head>
<body style="margin:0;background:#0d1a13;font-family:Arial,Helvetica,sans-serif;color:#eef3ef;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;">
<div style="max-width:420px;width:100%;background:#13241b;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:28px;text-align:center;">
<img src="/icons/icon-192.png" width="56" height="56" alt="" style="border-radius:50%;" />
<h1 style="font-size:20px;margin:14px 0 8px;">${title}</h1>${body}
</div></body></html>`;
  return new NextResponse(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

const BUTTON =
  "display:inline-block;margin-top:16px;background:#1D9E75;color:#ffffff;border:0;border-radius:12px;padding:12px 24px;font-size:15px;font-weight:bold;text-decoration:none;cursor:pointer;";
const TEXT = "font-size:14px;line-height:1.6;color:#b8c4bd;margin:0;";

function params(request: NextRequest) {
  const url = new URL(request.url);
  return { userId: url.searchParams.get("u") ?? "", token: url.searchParams.get("t") ?? "" };
}

export async function GET(request: NextRequest) {
  const { userId, token } = params(request);
  if (!userId || !token || !isValidUnsubscribeToken(userId, token)) {
    return page("Link not valid", `<p style="${TEXT}">This unsubscribe link is invalid. You can change email settings in the app under Settings → Notifications.</p>`, 400);
  }
  const action = `/api/notifications/unsubscribe?u=${encodeURIComponent(userId)}&t=${encodeURIComponent(token)}`;
  return page(
    "Turn off message emails?",
    `<p style="${TEXT}">You'll stop getting emails when someone messages you on Eden Harvest. You'll still see messages in the app.</p>
     <form method="post" action="${action}"><button type="submit" style="${BUTTON}">Turn off message emails</button></form>`
  );
}

export async function POST(request: NextRequest) {
  const { userId, token } = params(request);
  if (!userId || !token || !isValidUnsubscribeToken(userId, token)) {
    return page("Link not valid", `<p style="${TEXT}">This unsubscribe link is invalid.</p>`, 400);
  }

  const admin = createAdminClient();
  if (!admin) return page("Something went wrong", `<p style="${TEXT}">Please try again later.</p>`, 500);

  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) {
    // Account already deleted: nothing left to email.
    return page("You're unsubscribed", `<p style="${TEXT}">You won't get message emails from Eden Harvest.</p>`);
  }

  const prefs = { ...readNotificationPrefs(data.user.user_metadata), enquiries: false };
  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: { ...data.user.user_metadata, [NOTIFICATION_PREFS_METADATA_KEY]: prefs }
  });
  if (updateError) {
    console.error("unsubscribe failed:", updateError.message);
    return page("Something went wrong", `<p style="${TEXT}">Please try again, or turn emails off in Settings → Notifications.</p>`, 500);
  }

  return page(
    "You're unsubscribed",
    `<p style="${TEXT}">You won't get emails about new messages any more. You can turn them back on any time in Settings → Notifications.</p>
     <a href="/messages" style="${BUTTON}">Open messages</a>`
  );
}
