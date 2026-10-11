import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

/** Every seller profile with its owner and what retiring it would remove. */
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

  const { data: profiles, error } = await admin
    .from("seller_profiles")
    .select(
      "id, farm_name, state_region, is_verified, created_at, african_countries(name, flag_emoji), users(email, role, membership_tier)"
    )
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (profiles ?? []).map((p) => p.id as string);
  const [{ data: listings }, { data: enquiries }] = await Promise.all([
    ids.length
      ? admin.from("listings").select("seller_id, is_active").in("seller_id", ids)
      : Promise.resolve({ data: [] as { seller_id: string; is_active: boolean }[] }),
    ids.length
      ? admin.from("enquiries").select("seller_id").in("seller_id", ids)
      : Promise.resolve({ data: [] as { seller_id: string }[] })
  ]);

  const sellers = (profiles ?? []).map((p) => {
    const mine = (listings ?? []).filter((l) => l.seller_id === p.id);
    return {
      ...p,
      listingCount: mine.length,
      activeListingCount: mine.filter((l) => l.is_active).length,
      enquiryCount: (enquiries ?? []).filter((e) => e.seller_id === p.id).length
    };
  });

  return NextResponse.json({ sellers });
}
