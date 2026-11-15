/** Business rules for in-app orders. Change here, not in the routes. */

/** Eden Harvest's commission, deducted from the farmer's payout. */
export const COMMISSION_RATE = 0.08;

/** Days the farmer has to dispatch a paid order before it's cancelled and refunded. */
export const DISPATCH_DAYS = 3;

/**
 * Days after dispatch before the payment is released to the farmer if the
 * buyer neither confirms nor reports a problem: about 2 days in transit plus
 * 3 days for the buyer to check the goods.
 */
export const RELEASE_DAYS_AFTER_DISPATCH = 5;

/** Currencies the checkout can take today (Paystack, Nigeria). */
export const CHECKOUT_CURRENCIES = ["NGN"] as const;

export const DAY_MS = 24 * 60 * 60 * 1000;

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "dispatched"
  | "completed"
  | "disputed"
  | "refunded"
  | "cancelled";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid – awaiting dispatch",
  dispatched: "Dispatched",
  completed: "Completed",
  disputed: "Problem reported",
  refunded: "Refunded",
  cancelled: "Cancelled"
};

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function orderAmounts(unitPrice: number, quantity: number, deliveryFee: number) {
  const subtotal = roundMoney(unitPrice * quantity);
  const delivery = roundMoney(Math.max(deliveryFee, 0));
  const total = roundMoney(subtotal + delivery);
  // Commission is on the produce only, not on the delivery fee the farmer passes on.
  const commission = roundMoney(subtotal * COMMISSION_RATE);
  return { subtotal, delivery, total, commission, sellerPayout: roundMoney(total - commission) };
}

export function newOrderNumber(): string {
  const d = new Date();
  const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `EH-${ymd}-${rand}`;
}
