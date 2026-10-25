import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBuyerAccess } from "@/lib/access/server";
import { notifyAdminOfSignup } from "@/lib/notifications/adminAlerts";

/** The signed-in user's Verified Access, as the server sees it (paid, trial or admin). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const access = await getBuyerAccess(user);

  // Catch-all for new accounts the sign-up and callback alerts missed.
  if (user.app_metadata?.admin_signup_alert_sent !== true) {
    const userId = user.id;
    after(() => notifyAdminOfSignup(userId));
  }
  return NextResponse.json(access, { headers: { "Cache-Control": "no-store" } });
}
