import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { setAppMetadata } from "@/lib/access/server";
import { trialEndsAt } from "@/lib/access/trial";
import { sendTrialEndingEmail } from "@/lib/notifications/trialEmail";
import { moveSellerPrivateDetails } from "@/lib/seller/privateDetails";

/**
 * Daily (vercel.json → crons): emails each buyer once, about 3 days before
 * their free trial ends, unless they've already subscribed. Also sweeps any
 * seller numbers still left in seller_profiles into private storage.
 *
 * Only Vercel's scheduler should call this. If CRON_SECRET is set in Vercel,
 * Vercel sends it as a Bearer token and we require it. Without it we accept
 * Vercel's cron user agent; a spoofed call could at most send reminders that
 * were due anyway, once.
 */

const REMIND_WITHIN_MS = 3 * 24 * 60 * 60 * 1000;
const PAGE_SIZE = 1000;

function isAuthorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) return request.headers.get("authorization") === `Bearer ${secret}`;
  return (request.headers.get("user-agent") ?? "").startsWith("vercel-cron");
}

export async function GET(request: NextRequest) {
  if (!isAuthorised(request)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Not configured." }, { status: 500 });
  }

  await moveSellerPrivateDetails(admin);

  const now = Date.now();
  const due: { id: string; email: string; endsAt: string; meta: Record<string, unknown> }[] = [];

  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) {
      console.error("trial reminders: listUsers failed:", error.message);
      break;
    }
    for (const user of data.users) {
      const meta = user.app_metadata ?? {};
      if (!user.email || meta.va_paid === true || meta.trial_reminder_sent === true) continue;
      const ends = trialEndsAt(user.created_at);
      if (!ends) continue;
      const left = ends.getTime() - now;
      if (left > 0 && left <= REMIND_WITHIN_MS) {
        due.push({ id: user.id, email: user.email, endsAt: ends.toISOString(), meta });
      }
    }
    if (data.users.length < PAGE_SIZE) break;
  }

  if (due.length === 0) return NextResponse.json({ sent: 0 });

  // Buyers only, and use the name they gave us.
  const { data: rows } = await admin
    .from("users")
    .select("id, role, full_name")
    .in(
      "id",
      due.map((d) => d.id)
    );
  const byId = new Map((rows ?? []).map((r) => [r.id as string, r]));

  let sent = 0;
  for (const user of due) {
    const row = byId.get(user.id);
    if (!row || row.role !== "buyer") continue;
    const ok = await sendTrialEndingEmail({
      to: user.email,
      name: (row.full_name as string | null) ?? null,
      trialEndsAt: user.endsAt
    });
    if (ok) {
      sent += 1;
      await setAppMetadata(user.id, { trial_reminder_sent: true }, user.meta);
    }
  }

  return NextResponse.json({ sent });
}
