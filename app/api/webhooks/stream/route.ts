import { NextRequest, NextResponse } from "next/server";

/**
 * Stub — mirrors app/api/webhooks/stripe/route.ts. Point Stream's dashboard
 * webhook URL here once deployed. Currently just logs the event type; wire
 * up real handling (e.g. Resend follow-ups, syncing accepted-offer events
 * into Supabase) once the base in-app chat is confirmed working.
 */
export async function POST(request: NextRequest) {
  let event: { type?: string } = {};
  try {
    event = await request.json();
  } catch {
    // Stream may send a webhook verification ping with no body.
  }

  console.log("Stream webhook received:", event.type ?? "unknown");

  return NextResponse.json({ received: true });
}
