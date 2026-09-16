import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchUserProfile } from "@/lib/auth/profile";
import { enquiryChannelId, getStreamServerClient, upsertStreamUser } from "@/lib/stream/server";

interface StartChatBody {
  sellerProfileId?: string;
  listingId?: string;
}

export async function POST(request: NextRequest) {
  let body: StartChatBody;
  try {
    body = (await request.json()) as StartChatBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { sellerProfileId, listingId } = body;
  if (!sellerProfileId) {
    return NextResponse.json({ error: "sellerProfileId is required." }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user: authUser }
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  // Re-check entitlement server-side — the client's membership_tier is not
  // trusted for gating, only for UI. This is what actually enforces
  // "subscription lapsed => in-app conversation access stops," which a raw
  // WhatsApp number can't do.
  const buyerProfile = await fetchUserProfile(supabase, authUser.id);
  if (buyerProfile?.membership_tier !== "verified_access") {
    return NextResponse.json(
      { error: "Verified Access is required to message sellers in-app." },
      { status: 403 }
    );
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Chat is not configured." }, { status: 500 });
  }

  const { data: sellerProfile, error: sellerError } = await admin
    .from("seller_profiles")
    .select("user_id, farm_name")
    .eq("id", sellerProfileId)
    .maybeSingle();

  if (sellerError || !sellerProfile?.user_id) {
    return NextResponse.json({ error: "Seller not found." }, { status: 404 });
  }

  let streamClient;
  try {
    streamClient = getStreamServerClient();
  } catch (error) {
    console.error("Stream not configured:", error);
    return NextResponse.json({ error: "Chat is not configured." }, { status: 500 });
  }

  try {
    await Promise.all([
      upsertStreamUser({
        id: authUser.id,
        name: buyerProfile.full_name ?? authUser.email?.split("@")[0] ?? "Buyer"
      }),
      upsertStreamUser({ id: sellerProfile.user_id, name: sellerProfile.farm_name })
    ]);

    const channelId = enquiryChannelId(authUser.id, sellerProfile.user_id);
    const channel = streamClient.channel("messaging", channelId, {
      members: [authUser.id, sellerProfile.user_id],
      created_by_id: authUser.id,
      ...(listingId ? { listing_id: listingId } : {})
    });
    await channel.create();

    return NextResponse.json({ channelId });
  } catch (error) {
    console.error("Stream channel create failed:", error);
    return NextResponse.json({ error: "Could not start conversation." }, { status: 500 });
  }
}
