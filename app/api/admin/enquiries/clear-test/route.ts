import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/auth/admin";
import { adminUserIds } from "@/lib/enquiries/inspect";

export const dynamic = "force-dynamic";

/**
 * Admin-only: delete enquiry records created by admin accounts while testing.
 * Only rows whose buyer is an admin are touched; the chats themselves stay.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Server admin client is not configured." }, { status: 500 });

  const ids = [...(await adminUserIds(admin))];
  if (!ids.length) return NextResponse.json({ deleted: 0 });

  const { data, error } = await admin.from("enquiries").delete().in("buyer_id", ids).select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: data?.length ?? 0 });
}
