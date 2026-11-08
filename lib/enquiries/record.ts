import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStreamServerClient } from "@/lib/stream/server";
import { isAdminUser } from "@/lib/auth/admin";

/**
 * Logs an enquiry when a buyer actually sends a message (called from the
 * Stream message.new webhook), not when they merely open a chat. One row per
 * buyer/listing pair, so only their first message about a listing counts.
 * Messages from the seller, and from admin accounts testing the app, are
 * never counted.
 */
export async function recordEnquiryFromMessage(params: {
  channelType: string;
  channelId: string;
  senderId: string;
  listingIdFromEvent?: string | null;
}): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  // The chat remembers which listing the buyer last tapped "Message" on.
  let listingId = params.listingIdFromEvent ?? null;
  if (!listingId) {
    const [channel] = await getStreamServerClient().queryChannels(
      { cid: { $eq: `${params.channelType}:${params.channelId}` } },
      {},
      { limit: 1, state: false, watch: false, presence: false }
    );
    listingId = ((channel?.data as Record<string, unknown> | undefined)?.listing_id as string | undefined) ?? null;
  }
  if (!listingId) return;

  const { data: listing } = await admin.from("listings").select("seller_id").eq("id", listingId).maybeSingle();
  if (!listing?.seller_id) return;
  const { data: seller } = await admin
    .from("seller_profiles")
    .select("user_id")
    .eq("id", listing.seller_id)
    .maybeSingle();
  if (!seller?.user_id || seller.user_id === params.senderId) return;

  const { data: sender } = await admin.auth.admin.getUserById(params.senderId);
  if (!sender?.user || isAdminUser(sender.user)) return;

  const { data: existing } = await admin
    .from("enquiries")
    .select("id")
    .eq("buyer_id", params.senderId)
    .eq("listing_id", listingId)
    .maybeSingle();
  if (existing) return;

  const { error } = await admin.from("enquiries").insert({
    buyer_id: params.senderId,
    listing_id: listingId,
    seller_id: listing.seller_id
  });
  if (error) console.error("enquiry insert:", error.message);
}
