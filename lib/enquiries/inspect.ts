import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { enquiryChannelId, getStreamServerClient } from "@/lib/stream/server";
import { getAdminEmails } from "@/lib/auth/admin";

export interface ChatInfo {
  exists?: boolean;
  error?: string;
  buyerMessages?: number;
  sellerMessages?: number;
  lastMessageAt?: string | null;
  sellerLastReadAt?: string | null;
  blockedMessages?: number;
}

/** What actually happened in the chat between this buyer and seller. */
export async function inspectChat(buyerId: string, sellerUserId: string): Promise<ChatInfo> {
  let stream;
  try {
    stream = getStreamServerClient();
  } catch {
    return { error: "Chat service not configured." };
  }
  try {
    const channel = stream.channel("messaging", enquiryChannelId(buyerId, sellerUserId));
    const state = await channel.query({ messages: { limit: 100 }, state: true });
    const all = state.messages ?? [];
    const messages = all.filter((m) => m.type !== "system" && m.type !== "error" && !m.deleted_at);
    const sellerRead = (state.read ?? []).find((r) => r.user?.id === sellerUserId);
    return {
      exists: true,
      buyerMessages: messages.filter((m) => m.user?.id === buyerId).length,
      sellerMessages: messages.filter((m) => m.user?.id === sellerUserId).length,
      lastMessageAt: messages.length ? (messages[messages.length - 1].created_at as string) : null,
      sellerLastReadAt: (sellerRead?.last_read as string | undefined) ?? null,
      blockedMessages: all.filter((m) => m.type === "error").length
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return msg.includes("does not exist") ? { exists: false } : { error: msg.slice(0, 160) };
  }
}

/** Ids of the app's admin accounts (ADMIN_EMAILS), so their test activity can be left out. */
export async function adminUserIds(admin: SupabaseClient): Promise<Set<string>> {
  const emails = getAdminEmails();
  if (!emails.length) return new Set();
  const { data } = await admin.from("users").select("id, email");
  return new Set(
    (data ?? [])
      .filter((u) => emails.includes(String(u.email ?? "").trim().toLowerCase()))
      .map((u) => u.id as string)
  );
}
