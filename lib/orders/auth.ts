import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/auth/admin";
import type { OrderRow } from "@/lib/orders/server";

/** The signed-in user, the service-role client and (if any) their seller profile id. */
export async function orderContext() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const admin = createAdminClient();
  if (!user || !admin) return { user: null, admin: null, sellerId: null, isAdmin: false } as const;
  const { data: seller } = await admin.from("seller_profiles").select("id").eq("user_id", user.id).maybeSingle();
  return { user, admin, sellerId: (seller?.id as string | undefined) ?? null, isAdmin: isAdminUser(user) } as const;
}

export type Viewer = "buyer" | "seller" | "admin";

/** How the viewer relates to the order, or null if they may not see it. */
export function viewerRole(
  order: Pick<OrderRow, "buyer_id" | "seller_id">,
  ctx: { userId: string; sellerId: string | null; isAdmin: boolean }
): Viewer | null {
  if (order.buyer_id === ctx.userId) return "buyer";
  if (ctx.sellerId && order.seller_id === ctx.sellerId) return "seller";
  if (ctx.isAdmin) return "admin";
  return null;
}
