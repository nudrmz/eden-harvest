import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/auth/admin";
import { enquiryChannelId, getStreamServerClient } from "@/lib/stream/server";
import { readNotificationPrefs } from "@/lib/notifications/prefs";

export const dynamic = "force-dynamic";

/**
 * Admin-only: what actually happened with each of a seller's enquiries.
 * An enquiry is logged when a buyer taps "Message" (the chat is opened), not
 * when they send something, so this checks the chat itself: how many messages
 * each side sent, and whether the seller has opened it. It also reports the
 * seller's last sign-in and whether message emails are switched on.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Server admin client is not configured." }, { status: 500 });

  const { data: seller } = await admin
    .from("seller_profiles")
    .select("id, user_id, farm_name")
    .eq("id", id)
    .maybeSingle();
  if (!seller?.user_id) return NextResponse.json({ error: "Seller not found." }, { status: 404 });
  const sellerUserId = seller.user_id as string;

  const [{ data: enquiries }, { data: sellerAuth }] = await Promise.all([
    admin
      .from("enquiries")
      .select("id, buyer_id, listing_id, created_at")
      .eq("seller_id", id)
      .order("created_at", { ascending: false }),
    admin.auth.admin.getUserById(sellerUserId)
  ]);

  const rows = enquiries ?? [];
  const buyerIds = [...new Set(rows.map((e) => e.buyer_id as string))];
  const listingIds = [...new Set(rows.map((e) => e.listing_id as string).filter(Boolean))];
  const [{ data: buyers }, { data: listings }] = await Promise.all([
    buyerIds.length
      ? admin.from("users").select("id, full_name, email").in("id", buyerIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null; email: string }[] }),
    listingIds.length
      ? admin.from("listings").select("id, product_name").in("id", listingIds)
      : Promise.resolve({ data: [] as { id: string; product_name: string }[] })
  ]);

  let stream: ReturnType<typeof getStreamServerClient> | null = null;
  try {
    stream = getStreamServerClient();
  } catch {
    stream = null;
  }

  // One chat per buyer/seller pair, so look each chat up once.
  const chats = new Map<string, unknown>();
  await Promise.all(
    buyerIds.map(async (buyerId) => {
      if (!stream) return chats.set(buyerId, { error: "Chat service not configured." });
      try {
        const channel = stream.channel("messaging", enquiryChannelId(buyerId, sellerUserId));
        const state = await channel.query({ messages: { limit: 100 }, state: true });
        const messages = (state.messages ?? []).filter((m) => m.type !== "system" && !m.deleted_at);
        const fromBuyer = messages.filter((m) => m.user?.id === buyerId);
        const fromSeller = messages.filter((m) => m.user?.id === sellerUserId);
        const sellerRead = (state.read ?? []).find((r) => r.user?.id === sellerUserId);
        const blocked = (state.messages ?? []).filter((m) => m.type === "error").length;
        chats.set(buyerId, {
          exists: true,
          buyerMessages: fromBuyer.length,
          sellerMessages: fromSeller.length,
          firstBuyerMessageAt: fromBuyer[0]?.created_at ?? null,
          lastMessageAt: messages.length ? messages[messages.length - 1].created_at : null,
          sellerLastReadAt: sellerRead?.last_read ?? null,
          sellerUnread: sellerRead?.unread_messages ?? null,
          blockedMessages: blocked
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        chats.set(buyerId, msg.includes("does not exist") ? { exists: false } : { error: msg.slice(0, 160) });
      }
    })
  );

  let sellerStreamLastActive: string | null = null;
  if (stream) {
    try {
      const res = await stream.queryUsers({ id: { $eq: sellerUserId } });
      sellerStreamLastActive = (res.users[0]?.last_active as string | undefined) ?? null;
    } catch {
      sellerStreamLastActive = null;
    }
  }

  const account = sellerAuth?.user;
  return NextResponse.json(
    {
      seller: {
        farmName: seller.farm_name,
        email: account?.email ?? null,
        lastSignInAt: account?.last_sign_in_at ?? null,
        lastActiveInChat: sellerStreamLastActive,
        messageEmailsOn: account ? readNotificationPrefs(account.user_metadata).enquiries : null
      },
      enquiries: rows.map((e) => {
        const buyer = (buyers ?? []).find((b) => b.id === e.buyer_id);
        const listing = (listings ?? []).find((l) => l.id === e.listing_id);
        return {
          id: e.id,
          createdAt: e.created_at,
          buyer: buyer ? { name: buyer.full_name, email: buyer.email } : null,
          listing: listing?.product_name ?? null,
          chat: chats.get(e.buyer_id as string) ?? null
        };
      })
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
