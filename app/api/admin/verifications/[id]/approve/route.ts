import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/auth/admin";

interface RouteParams {
  params: { id: string };
}

export async function POST(_request: Request, { params }: RouteParams) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Server admin client is not configured (SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 500 }
    );
  }

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("seller_profiles")
    .update({
      is_verified: true,
      verified_at: now,
      verification_status: "approved",
      verification_reviewed_at: now,
      verification_review_note: null
    })
    .eq("id", params.id)
    .select("id, farm_name, is_verified, verification_status")
    .maybeSingle();

  if (error) {
    if (error.message.toLowerCase().includes("verification_status")) {
      const fallback = await admin
        .from("seller_profiles")
        .update({ is_verified: true, verified_at: now })
        .eq("id", params.id)
        .select("id, farm_name, is_verified")
        .maybeSingle();

      if (fallback.error) {
        return NextResponse.json({ error: fallback.error.message }, { status: 500 });
      }
      if (!fallback.data) {
        return NextResponse.json({ error: "Seller not found." }, { status: 404 });
      }
      return NextResponse.json({ seller: fallback.data });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Seller not found." }, { status: 404 });
  }

  return NextResponse.json({ seller: data });
}
