import "server-only";
import crypto from "node:crypto";

/**
 * Minimal Paystack client (https://paystack.com/docs/api). Uses
 * PAYSTACK_SECRET_KEY: a test key (sk_test_…) for testing, the live key
 * once the settlement account is approved.
 */
const API = "https://api.paystack.co";

export function paystackKey(): string | null {
  return process.env.PAYSTACK_SECRET_KEY?.trim() || null;
}

export function isPaystackTestMode(): boolean {
  return (paystackKey() ?? "").startsWith("sk_test_");
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const key = paystackKey();
  if (!key) throw new Error("Payments aren't set up yet (PAYSTACK_SECRET_KEY missing).");
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store"
  });
  const json = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: T };
  if (!res.ok || json.status === false) throw new Error(json.message || `Paystack error ${res.status}`);
  return json.data as T;
}

/** Amounts go to Paystack in the smallest unit (kobo for NGN). */
export const toMinor = (amount: number) => Math.round(amount * 100);
export const fromMinor = (amount: number) => amount / 100;

export function initializeTransaction(params: {
  email: string;
  amount: number;
  currency: string;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}) {
  return call<{ authorization_url: string; access_code: string; reference: string }>("POST", "/transaction/initialize", {
    email: params.email,
    amount: toMinor(params.amount),
    currency: params.currency,
    reference: params.reference,
    callback_url: params.callbackUrl,
    metadata: params.metadata
  });
}

export interface PaystackTransaction {
  id: number;
  status: string;
  reference: string;
  amount: number;
  currency: string;
  paid_at: string | null;
  customer?: { email?: string };
}

export function verifyTransaction(reference: string) {
  return call<PaystackTransaction>("GET", `/transaction/verify/${encodeURIComponent(reference)}`);
}

/** Full refund when amount is omitted. */
export function refundTransaction(reference: string, amount?: number) {
  return call<{ status: string }>("POST", "/refund", {
    transaction: reference,
    ...(amount ? { amount: toMinor(amount) } : {})
  });
}

export function listBanks() {
  return call<{ name: string; code: string; active: boolean }[]>("GET", "/bank?country=nigeria&perPage=200");
}

export function resolveAccount(accountNumber: string, bankCode: string) {
  return call<{ account_number: string; account_name: string }>(
    "GET",
    `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`
  );
}

export function createTransferRecipient(params: { name: string; accountNumber: string; bankCode: string }) {
  return call<{ recipient_code: string }>("POST", "/transferrecipient", {
    type: "nuban",
    name: params.name,
    account_number: params.accountNumber,
    bank_code: params.bankCode,
    currency: "NGN"
  });
}

export function initiateTransfer(params: { amount: number; recipient: string; reference: string; reason: string }) {
  return call<{ transfer_code: string; status: string; reference: string }>("POST", "/transfer", {
    source: "balance",
    amount: toMinor(params.amount),
    recipient: params.recipient,
    reference: params.reference,
    reason: params.reason
  });
}

/** Paystack signs webhooks with HMAC-SHA512 of the raw body using the secret key. */
export function isValidWebhook(rawBody: string, signature: string | null): boolean {
  const key = paystackKey();
  if (!key || !signature) return false;
  const expected = crypto.createHmac("sha512", key).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
