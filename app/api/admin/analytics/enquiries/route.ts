import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/auth/admin";
import { adminUserIds, inspectChat, type ChatInfo } from "@/lib/enquiries/inspect";

export const dynamic = "force-dynamic";

const HOUR = 60 * 60 * 1000;
const RANGE_MS: Record<string, number> = { "24h": 24 * HOUR, "7": 7 * 24 * HOUR, "30": 30 * 24 * HOUR, "90": 90 * 24 * HOUR };
/** Chats are checked one by one with the chat service, so cap the list. */
const MAX_CHECKED = 40;

/**
 * Admin-only: enquiries in the chosen range, with what happened in each chat
 * (who sent what, whether the seller has read it). Admin test chats are left out.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Server admin client is not configured." }, { status: 500 });

  const range = request.nextUrl.searchParams.get("range") ?? "30";
  const sinceIso = new Date(Date.now() - (RANGE_MS[range] ?? RANGE_MS["30"])).toISOString();

  const [{ data: rows }, admins] = await Promise.all([
    admin
      .from("enquiries")
      .select("id, buyer_id, listing_id, seller_id, created_at")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false }),
    adminUserIds(admin)
  ]);
  const enquiries = (rows ?? []).filter((e) => !admins.has(e.buyer_id as string));

  const buyerIds = [...new Set(enquiries.map((e) => e.buyer_id as string))];
  const listingIds = [...new Set(enquiries.map((e) => e.listing_id as string).filter(Boolean))];
  const sellerIds = [...new Set(enquiries.map((e) => e.seller_id as string))];
  const [{ data: buyers }, { data: listings }, { data: sellers }] = await Promise.all([
    buyerIds.length ? admin.from("users").select("id, full_name, email").in("id", buyerIds) : Promise.resolve({ data: [] }),
    listingIds.length ? admin.from("listings").select("id, product_name").in("id", listingIds) : Promise.resolve({ data: [] }),
    sellerIds.length
      ? admin.from("seller_profiles").select("id, user_id, farm_name").in("id", sellerIds)
      : Promise.resolve({ data: [] })
  ]);
  const byId = <T extends { id: string }>(list: T[] | null) => new Map((list ?? []).map((x) => [x.id, x]));
  const buyerMap = byId(buyers as { id: string; full_name: string | null; email: string }[]);
  const listingMap = byId(listings as { id: string; product_name: string }[]);
  const sellerMap = byId(sellers as { id: string; user_id: string; farm_name: string }[]);

  // One chat per buyer/seller pair; check each pair once.
  const chatCache = new Map<string, Promise<ChatInfo>>();
  const checked = enquiries.slice(0, MAX_CHECKED);
  const items = await Promise.all(
    checked.map(async (e) => {
      const seller = sellerMap.get(e.seller_id as string);
      let chat: ChatInfo | null = null;
      if (seller?.user_id) {
        const key = `${e.buyer_id}:${seller.user_id}`;
        if (!chatCache.has(key)) chatCache.set(key, inspectChat(e.buyer_id as string, seller.user_id));
        chat = await chatCache.get(key)!;
      }
      const buyer = buyerMap.get(e.buyer_id as string);
      return {
        id: e.id,
        createdAt: e.created_at,
        buyer: buyer ? buyer.full_name || buyer.email : "Unknown buyer",
        listing: listingMap.get(e.listing_id as string)?.product_name ?? "Listing removed",
        farm: seller?.farm_name ?? "Unknown farm",
        chat
      };
    })
  );

  const farmCounts = new Map<string, number>();
  for (const e of enquiries) {
    const farm = sellerMap.get(e.seller_id as string)?.farm_name ?? "Unknown farm";
    farmCounts.set(farm, (farmCounts.get(farm) ?? 0) + 1);
  }

  return NextResponse.json(
    {
      total: enquiries.length,
      replied: items.filter((i) => (i.chat?.sellerMessages ?? 0) > 0).length,
      awaitingReply: items.filter((i) => (i.chat?.buyerMessages ?? 0) > 0 && !(i.chat?.sellerMessages ?? 0)).length,
      noMessage: items.filter((i) => i.chat?.exists !== false && !i.chat?.error && !(i.chat?.buyerMessages ?? 0)).length,
      checkedCount: items.length,
      byFarm: [...farmCounts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
      items
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
