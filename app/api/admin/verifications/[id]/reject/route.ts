import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/auth/admin";

interface RouteParams {
  params: { id: string };
}

export async function POST(request: Request, { params }: RouteParams) {
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

  let note: string | null = null;
  try {
    const body = (await request.json()) as { note?: string };
    note = body.note?.trim() || null;
  } catch {
    note = null;
  }

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("seller_profiles")
    .update({
      is_verified: false,
      verified_at: null,
      verification_status: "rejected",
      verification_reviewed_at: now,
      verification_review_note: note
    })
    .eq("id", params.id)
    .select("id, farm_name, is_verified, verification_status")
    .maybeSingle();

  if (error) {
    if (error.message.toLowerCase().includes("verification_status")) {
      return NextResponse.json(
        {
          error:
            "Run the seller verification migration in Supabase before rejecting applications."
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Seller not found." }, { status: 404 });
  }

  return NextResponse.json({ seller: data });
}
