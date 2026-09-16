import "server-only";
import { createHash } from "crypto";
import { StreamChat } from "stream-chat";

/**
 * Server-only Stream Chat client. NEVER import this file from anything that
 * can end up in a client bundle (a "use client" component, or a module that
 * such a component imports) — it reads STREAM_API_SECRET. Only import it
 * from files under app/api/** /route.ts, which Next.js never bundles for the
 * browser.
 */

let cached: StreamChat | null = null;

export function getStreamServerClient(): StreamChat {
  if (cached) return cached;

  const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
  const apiSecret = process.env.STREAM_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error(
      "Stream is not configured — set NEXT_PUBLIC_STREAM_API_KEY and STREAM_API_SECRET."
    );
  }

  cached = StreamChat.getInstance(apiKey, apiSecret);
  return cached;
}

/**
 * Deterministic channel id for a buyer/seller pair, independent of which
 * listing started the conversation (mirrors how the WhatsApp handoff works
 * today — one ongoing thread per seller, not per listing). Sorting the ids
 * before hashing means it doesn't matter which side calls this first.
 */
export function enquiryChannelId(userIdA: string, userIdB: string): string {
  const sorted = [userIdA, userIdB].sort().join(":");
  const hash = createHash("sha1").update(sorted).digest("hex").slice(0, 24);
  return `enq-${hash}`;
}

/** Idempotent — safe to call on every token request. */
export async function upsertStreamUser(params: {
  id: string;
  name: string;
}): Promise<void> {
  const client = getStreamServerClient();
  await client.upsertUser({ id: params.id, name: params.name });
}
