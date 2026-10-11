import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/auth/admin";

/** Fields an admin may change on any listing (moderation / fixing mistakes). */
const EDITABLE = [
  "product_name",
  "category",
  "price_local",
  "price_currency_code",
  "unit",
  "min_order_quantity",
  "min_order_unit",
  "description",
  "stock_status",
  "photo_url",
  "is_active"
] as const;

export async function PATCH(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
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

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const update: Record<string, unknown> = {};
  for (const key of EDITABLE) {
    if (key in body) update[key] = body[key];
  }
  if (!Object.keys(update).length) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }
  update.updated_at = new Date().toISOString();

  const { data, error } = await admin
    .from("listings")
    .update(update)
    .eq("id", params.id)
    .select("id, is_active")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Listing not found." }, { status: 404 });

  console.info(`admin ${user.email} updated listing ${params.id}: ${Object.keys(update).join(", ")}`);
  return NextResponse.json({ listing: data });
}
