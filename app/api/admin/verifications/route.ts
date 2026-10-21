import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/auth/admin";
import { getSellerPrivateDetails, moveSellerPrivateDetails } from "@/lib/seller/privateDetails";

interface QueueRow {
  user_id?: string;
  whatsapp_number?: string | null;
  verification_document_value?: string | null;
  [key: string]: unknown;
}

/** Fill in each seller's private numbers from their account, for admins only. */
async function withPrivateDetails(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  rows: QueueRow[]
): Promise<QueueRow[]> {
  return Promise.all(
    rows.map(async (row) => {
      if (!row.user_id) return row;
      const details = await getSellerPrivateDetails(admin, row.user_id);
      return {
        ...row,
        whatsapp_number: details.whatsapp ?? row.whatsapp_number ?? "",
        verification_document_value: details.documentValue ?? row.verification_document_value ?? ""
      };
    })
  );
}

export async function GET() {
  const supabase = await createClient();
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

  // Older sellers' numbers still sit in seller_profiles: move them out first.
  const moved = await moveSellerPrivateDetails(admin);
  if (moved > 0) console.info(`moved private details for ${moved} seller(s)`);

  const { data, error } = await admin
    .from("seller_profiles")
    .select(
      `
      id,
      user_id,
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
          user_id,
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
        sellers: await withPrivateDetails(admin, (fallback.data ?? []) as QueueRow[]),
        migrationRequired: true
      });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    sellers: await withPrivateDetails(admin, (data ?? []) as QueueRow[]),
    migrationRequired: false
  });
}
