import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/orders/adminAuth";
import { compareNames, lookupNin } from "@/lib/identity/dojah";
import { getSellerPrivateDetails, saveSellerPrivateDetails, type NinCheckSummary } from "@/lib/seller/privateDetails";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Admin-only: look the seller's NIN up with Dojah (NIMC data) and compare the
 * name with their Eden Harvest account. Each live lookup costs money, so it
 * only runs when an admin presses the button. The NIMC photo is returned for
 * display and is not stored.
 */
export async function POST(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const { admin } = ctx;

  const { data: seller } = await admin
    .from("seller_profiles")
    .select("id, user_id, verification_document_type, users ( full_name )")
    .eq("id", id)
    .maybeSingle();
  if (!seller) return NextResponse.json({ error: "Seller not found." }, { status: 404 });

  if (String(seller.verification_document_type ?? "").toLowerCase() !== "nin") {
    return NextResponse.json({ error: "This seller didn't give a NIN." }, { status: 400 });
  }

  const userId = seller.user_id as string;
  const details = await getSellerPrivateDetails(admin, userId);
  if (!details.documentValue) {
    return NextResponse.json({ error: "No NIN is saved for this seller." }, { status: 400 });
  }

  const lookup = await lookupNin(details.documentValue);
  const account = Array.isArray(seller.users) ? seller.users[0] : seller.users;
  const accountName = (account as { full_name?: string | null } | null)?.full_name ?? null;

  if (!lookup.ok) {
    if (lookup.reason === "not_found") {
      const summary: NinCheckSummary = {
        checkedAt: new Date().toISOString(),
        sandbox: false,
        result: "not_found",
        ninName: null,
        dateOfBirth: null,
        gender: null
      };
      await saveSellerPrivateDetails(admin, userId, { ninCheck: summary });
      return NextResponse.json({ check: summary, photo: null, accountName });
    }
    const status = lookup.reason === "not_configured" ? 503 : lookup.reason === "invalid_nin" ? 400 : 502;
    return NextResponse.json({ error: lookup.message }, { status });
  }

  const ninName = [lookup.firstName, lookup.middleName, lookup.lastName].filter(Boolean).join(" ");
  const summary: NinCheckSummary = {
    checkedAt: new Date().toISOString(),
    sandbox: lookup.sandbox,
    result: compareNames(accountName, [lookup.firstName, lookup.middleName, lookup.lastName]),
    ninName: ninName || null,
    dateOfBirth: lookup.dateOfBirth,
    gender: lookup.gender
  };
  await saveSellerPrivateDetails(admin, userId, { ninCheck: summary });

  return NextResponse.json({ check: summary, photo: lookup.photo, accountName });
}
