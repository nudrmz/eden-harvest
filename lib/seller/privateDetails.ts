import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { setAppMetadata } from "@/lib/access/server";

/**
 * A seller's WhatsApp number and ID number (NIN, CAC…) are private. They used
 * to sit in seller_profiles, where any signed-in user (and for the ID number,
 * anyone at all) could read them through the database API. They now live in
 * the seller's own account app_metadata, which only the server can read or
 * write. The old columns are NOT NULL, so they're left as empty strings.
 */

const KEY = "seller_private";

export interface SellerPrivateDetails {
  whatsapp: string | null;
  documentValue: string | null;
}

function readFrom(meta: Record<string, unknown> | undefined): SellerPrivateDetails {
  const stored = (meta?.[KEY] ?? {}) as Partial<Record<"whatsapp" | "document_value", unknown>>;
  return {
    whatsapp: typeof stored.whatsapp === "string" ? stored.whatsapp : null,
    documentValue: typeof stored.document_value === "string" ? stored.document_value : null
  };
}

export async function saveSellerPrivateDetails(
  admin: SupabaseClient,
  userId: string,
  details: { whatsapp?: string | null; documentValue?: string | null }
): Promise<boolean> {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) return false;
  const meta = data.user.app_metadata ?? {};
  const current = readFrom(meta);
  return setAppMetadata(
    userId,
    {
      [KEY]: {
        whatsapp: details.whatsapp ?? current.whatsapp,
        document_value: details.documentValue ?? current.documentValue
      }
    },
    meta
  );
}

export async function getSellerPrivateDetails(
  admin: SupabaseClient,
  userId: string
): Promise<SellerPrivateDetails> {
  const { data } = await admin.auth.admin.getUserById(userId);
  return readFrom(data.user?.app_metadata);
}

/**
 * Moves any numbers still in seller_profiles into app_metadata and blanks the
 * columns. Safe to run repeatedly; does nothing once everything has moved.
 * A row is only blanked after its numbers are safely stored.
 */
export async function moveSellerPrivateDetails(admin: SupabaseClient): Promise<number> {
  const { data: rows, error } = await admin
    .from("seller_profiles")
    .select("id, user_id, whatsapp_number, verification_document_value");
  if (error) {
    console.error("move seller details: select failed:", error.message);
    return 0;
  }

  let moved = 0;
  for (const row of rows ?? []) {
    const whatsapp = (row.whatsapp_number as string | null)?.trim() || null;
    const documentValue = (row.verification_document_value as string | null)?.trim() || null;
    if (!whatsapp && !documentValue) continue;

    const saved = await saveSellerPrivateDetails(admin, row.user_id as string, {
      whatsapp,
      documentValue
    });
    if (!saved) continue;

    const { error: blankError } = await admin
      .from("seller_profiles")
      .update({ whatsapp_number: "", verification_document_value: "" })
      .eq("id", row.id);
    if (blankError) {
      console.error("move seller details: blank failed:", blankError.message);
    } else {
      moved += 1;
    }
  }
  return moved;
}
