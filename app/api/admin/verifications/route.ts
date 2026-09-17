import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/auth/admin";

export async function GET() {
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

  const { data, error } = await admin
    .from("seller_profiles")
    .select(
      `
      id,
      farm_name,
      state_region,
      local_area,
      whatsapp_number,
      verification_document_type,
      verification_document_value,
      verification_status,
      is_verified,
      created_at,
      african_countries ( name, flag_emoji ),
      users ( email, full_name )
    `
    )
    .eq("verification_status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    // Fallback if migration not applied yet — show unverified rows.
    if (error.message.toLowerCase().includes("verification_status")) {
      const fallback = await admin
        .from("seller_profiles")
        .select(
          `
          id,
          farm_name,
          state_region,
          local_area,
          whatsapp_number,
          verification_document_type,
          verification_document_value,
          is_verified,
          created_at,
          african_countries ( name, flag_emoji ),
          users ( email, full_name )
        `
        )
        .eq("is_verified", false)
        .order("created_at", { ascending: true });

      if (fallback.error) {
        return NextResponse.json({ error: fallback.error.message }, { status: 500 });
      }

      return NextResponse.json({
        sellers: fallback.data ?? [],
        migrationRequired: true
      });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sellers: data ?? [], migrationRequired: false });
}
