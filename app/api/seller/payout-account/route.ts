import { NextRequest, NextResponse } from "next/server";
import { orderContext } from "@/lib/orders/auth";
import { createTransferRecipient, resolveAccount } from "@/lib/payments/paystack";

export const dynamic = "force-dynamic";

function mask(n: string) {
  return n.length > 4 ? `•••• ${n.slice(-4)}` : n;
}

/** The farmer's payout bank account (number masked). */
export async function GET() {
  const { user, admin, sellerId } = await orderContext();
  if (!user || !admin || !sellerId) return NextResponse.json({ error: "Seller sign-in required." }, { status: 401 });
  const { data } = await admin
    .from("seller_payout_accounts")
    .select("bank_name, account_number, account_name, updated_at")
    .eq("seller_id", sellerId)
    .maybeSingle();
  return NextResponse.json({
    account: data ? { bankName: data.bank_name, accountNumber: mask(String(data.account_number)), accountName: data.account_name } : null
  });
}

/** Save it: Paystack checks the number and returns the account holder's name. */
export async function PUT(request: NextRequest) {
  const { user, admin, sellerId } = await orderContext();
  if (!user || !admin || !sellerId) return NextResponse.json({ error: "Seller sign-in required." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { bankCode?: string; bankName?: string; accountNumber?: string };
  const bankCode = (body.bankCode ?? "").trim();
  const bankName = (body.bankName ?? "").trim().slice(0, 120);
  const accountNumber = (body.accountNumber ?? "").replace(/\D/g, "");
  if (!bankCode || accountNumber.length !== 10) {
    return NextResponse.json({ error: "Choose your bank and enter your 10-digit account number." }, { status: 400 });
  }
  try {
    const resolved = await resolveAccount(accountNumber, bankCode);
    const recipient = await createTransferRecipient({ name: resolved.account_name, accountNumber, bankCode });
    const { error } = await admin.from("seller_payout_accounts").upsert({
      seller_id: sellerId,
      bank_code: bankCode,
      bank_name: bankName,
      account_number: accountNumber,
      account_name: resolved.account_name,
      paystack_recipient_code: recipient.recipient_code,
      updated_at: new Date().toISOString()
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, accountName: resolved.account_name });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? `We couldn't verify that account: ${err.message}` : "We couldn't verify that account." },
      { status: 400 }
    );
  }
}
