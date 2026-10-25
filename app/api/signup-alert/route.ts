import { NextRequest, NextResponse, after } from "next/server";
import { notifyAdminOfSignup } from "@/lib/notifications/adminAlerts";

/**
 * Called by the sign-up form straight after an email sign-up, before the
 * person has confirmed (so there's no session yet). Only accounts created in
 * the last few minutes are announced, and each only once, so this can't be
 * used to spam the admin inbox or learn anything: it always answers "ok".
 */
const RECENT_MS = 10 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  let userId: string | undefined;
  try {
    userId = ((await request.json()) as { userId?: string }).userId;
  } catch {
    // ignore
  }
  if (userId && UUID.test(userId)) {
    after(() => notifyAdminOfSignup(userId, { maxAgeMs: RECENT_MS }));
  }
  return NextResponse.json({ ok: true });
}
