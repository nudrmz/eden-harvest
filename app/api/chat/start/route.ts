import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchUserProfile } from "@/lib/auth/profile";
import { enquiryChannelId, getStreamServerClient, upsertStreamUser } from "@/lib/stream/server";

interface StartChatBody {
  sellerProfileId?: string;
  listingId?: string;
}

/**
 * Log the enquiry that used to be recorded by the WhatsApp handoff, so the
 * seller dashboard's "Recent enquiries" still reflects buyer interest. One row
 * per buyer/listing pair — tapping Message again reopens the same thread, so a
 * second row would just inflate the seller's count. Insert runs on the
 * user-scoped client so the enquiries_insert_buyer RLS policy still applies.
 */
async function recordEnquiry(
  supabase: SupabaseClient,
  params: { buyerId: string; sellerProfileId: string; listingId: string }
): Promise<void> {
  const { data: existing } = await supabase
    .from("enquiries")
    .select("id")
    .eq("buyer_id", params.buyerId)
    .eq("listing_id", params.listingId)
    .maybeSingle();

  if (existing) return;

  const { error } = await supabase.from("enquiries").insert({
    buyer_id: params.buyerId,
    listing_id: params.listingId,
    seller_id: params.sellerProfileId
  });

  if (error) {
    console.error("enquiry insert:", error.message);
  }
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
  // "subscription lapsed => in-app conversation access stops."
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

  if (sellerProfile.user_id === authUser.id) {
    return NextResponse.json({ error: "You can't message your own listing." }, { status: 400 });
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
    const channelData: Record<string, unknown> = {
      members: [authUser.id, sellerProfile.user_id],
      created_by_id: authUser.id,
      // Custom field for empty-state copy (Stream reserves typed ChannelData fields).
      seller_farm_name: sellerProfile.farm_name
    };
    if (listingId) {
      channelData.listing_id = listingId;
    }

    const channel = streamClient.channel(
      "messaging",
      channelId,
      channelData as never
    );
    await channel.create();

    if (listingId) {
      await recordEnquiry(supabase, {
        buyerId: authUser.id,
        sellerProfileId,
        listingId
      });
    }

    return NextResponse.json({ channelId });
  } catch (error) {
    console.error("Stream channel create failed:", error);
    const raw = error instanceof Error ? error.message : "";
    if (raw.includes("Duplicate members")) {
      return NextResponse.json({ error: "You can't message your own listing." }, { status: 400 });
    }
    const detail = raw.replace(/^StreamChat error code \d+:\s*/, "").slice(0, 180);
    return NextResponse.json(
      { error: detail || "Could not start conversation." },
      { status: 500 }
    );
  }
}
