import { NextRequest, NextResponse } from "next/server";
import { orderContext } from "@/lib/orders/auth";
import { CHECKOUT_CURRENCIES, COMMISSION_RATE, newOrderNumber, orderAmounts } from "@/lib/orders/config";
import { initializeTransaction, paystackKey } from "@/lib/payments/paystack";
import { sweepOrders } from "@/lib/orders/server";

export const dynamic = "force-dynamic";

function clean(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** Start an order: checks the listing, creates it unpaid, returns the Paystack payment page. */
export async function POST(request: NextRequest) {
  const { user, admin, sellerId } = await orderContext();
  if (!user || !admin) return NextResponse.json({ error: "Please sign in to buy." }, { status: 401 });
  if (!paystackKey()) return NextResponse.json({ error: "Payments aren't switched on yet." }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const listingId = clean(body.listingId, 64);
  const quantity = Number(body.quantity);
  const deliveryName = clean(body.deliveryName, 120);
  const deliveryPhone = clean(body.deliveryPhone, 40);
  const deliveryAddress = clean(body.deliveryAddress, 500);
  const buyerNote = clean(body.note, 500) || null;
  if (!listingId || !Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: "Choose how many you want." }, { status: 400 });
  }
  if (!deliveryName || !deliveryPhone || deliveryAddress.length < 8) {
    return NextResponse.json({ error: "Add a name, phone number and full delivery address." }, { status: 400 });
  }

  const { data: listing } = await admin
    .from("listings")
    .select("id, seller_id, product_name, price_local, price_currency_code, unit, min_order_quantity, is_active, delivery_fee")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing || listing.is_active === false) {
    return NextResponse.json({ error: "This listing isn't available any more." }, { status: 404 });
  }
  if (sellerId && listing.seller_id === sellerId) {
    return NextResponse.json({ error: "You can't buy your own listing." }, { status: 400 });
  }
  const { data: seller } = await admin
    .from("seller_profiles")
    .select("id, farm_name, verification_status, is_verified")
    .eq("id", listing.seller_id)
    .maybeSingle();
  const approved = seller && (seller.verification_status ? seller.verification_status === "approved" : seller.is_verified);
  if (!approved) return NextResponse.json({ error: "This farm isn't approved to sell yet." }, { status: 400 });

  const currency = String(listing.price_currency_code);
  if (!(CHECKOUT_CURRENCIES as readonly string[]).includes(currency)) {
    return NextResponse.json(
      { error: "In-app checkout is only open for listings priced in Naira for now. Message the farmer instead." },
      { status: 400 }
    );
  }
  const minOrder = Number(listing.min_order_quantity) || 1;
  if (quantity < minOrder) {
    return NextResponse.json({ error: `The minimum order is ${minOrder} ${listing.unit}.` }, { status: 400 });
  }

  const amounts = orderAmounts(Number(listing.price_local), quantity, Number(listing.delivery_fee) || 0);
  const orderNumber = newOrderNumber();
  const { data: order, error } = await admin
    .from("orders")
    .insert({
      order_number: orderNumber,
      buyer_id: user.id,
      seller_id: listing.seller_id,
      listing_id: listing.id,
      product_name: listing.product_name,
      quantity,
      unit: listing.unit,
      unit_price: Number(listing.price_local),
      subtotal: amounts.subtotal,
      delivery_fee: amounts.delivery,
      total: amounts.total,
      currency,
      commission_rate: COMMISSION_RATE,
      commission_amount: amounts.commission,
      seller_payout: amounts.sellerPayout,
      payment_provider: "paystack",
      payment_reference: orderNumber,
      delivery_name: deliveryName,
      delivery_phone: deliveryPhone,
      delivery_address: deliveryAddress,
      buyer_note: buyerNote
    })
    .select("id")
    .single();
  if (error || !order) return NextResponse.json({ error: error?.message ?? "Couldn't create the order." }, { status: 500 });

  try {
    const origin = request.nextUrl.origin;
    const pay = await initializeTransaction({
      email: user.email ?? "",
      amount: amounts.total,
      currency,
      reference: orderNumber,
      callbackUrl: `${origin}/api/orders/verify`,
      metadata: { order_id: order.id, order_number: orderNumber, farm: seller?.farm_name }
    });
    return NextResponse.json({ orderId: order.id, paymentUrl: pay.authorization_url });
  } catch (err) {
    await admin.from("orders").update({ status: "cancelled" }).eq("id", order.id);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Payment couldn't start." }, { status: 502 });
  }
}

/** The signed-in user's orders: as a buyer, and as a farmer if they sell. */
export async function GET() {
  const { user, admin, sellerId } = await orderContext();
  if (!user || !admin) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  await sweepOrders(admin).catch(() => undefined);

  const cols =
    "id, order_number, product_name, quantity, unit, total, currency, status, payout_status, seller_payout, created_at, paid_at, dispatched_at, seller_id, buyer_id";
  const [{ data: bought }, { data: sold }] = await Promise.all([
    admin.from("orders").select(cols).eq("buyer_id", user.id).neq("status", "pending_payment").order("created_at", { ascending: false }).limit(100),
    sellerId
      ? admin.from("orders").select(cols).eq("seller_id", sellerId).not("status", "in", "(pending_payment,cancelled)").order("created_at", { ascending: false }).limit(100)
      : Promise.resolve({ data: [] })
  ]);
  const sellerIds = [...new Set((bought ?? []).map((o) => o.seller_id as string))];
  const { data: farms } = sellerIds.length
    ? await admin.from("seller_profiles").select("id, farm_name").in("id", sellerIds)
    : { data: [] as { id: string; farm_name: string }[] };
  const farmName = new Map((farms ?? []).map((f) => [f.id as string, f.farm_name as string]));
  return NextResponse.json(
    {
      isSeller: Boolean(sellerId),
      bought: (bought ?? []).map((o) => ({ ...o, farm_name: farmName.get(o.seller_id as string) ?? null })),
      sold: sold ?? []
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
