import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { headers } from "next/headers";
import { countryByCode, countryShortName, currencyForCountryCode } from "@/lib/data/buyer-countries";

const BASE_CURRENCY = "NGN";
const ER_API_URL = "https://open.er-api.com/v6/latest/NGN";
const FRESH_MS = 24 * 60 * 60 * 1000;

export type ExchangeRateMap = Record<string, number>;

const BUYER_CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: "£",
  USD: "$",
  EUR: "€",
  NGN: "₦",
  GHS: "₵",
  KES: "KSh",
  ZAR: "R",
  CAD: "CA$",
  AUD: "A$"
};

interface ErApiResponse {
  result?: string;
  base_code?: string;
  rates?: Record<string, number>;
}

export function getCurrencySymbol(code: string): string {
  if (BUYER_CURRENCY_SYMBOLS[code]) return BUYER_CURRENCY_SYMBOLS[code];
  try {
    const symbol = new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol"
    })
      .formatToParts(0)
      .find((p) => p.type === "currency")?.value;
    // Bare codes ("AED") read better with a space before the amount.
    if (symbol) return /^[A-Z]{3}$/.test(symbol) ? `${symbol} ` : symbol;
  } catch {
    /* unknown code */
  }
  return `${code} `;
}

export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: ExchangeRateMap
): number {
  if (fromCurrency === toCurrency) return amount;
  const fromRate = fromCurrency === BASE_CURRENCY ? 1 : rates[fromCurrency];
  const toRate = toCurrency === BASE_CURRENCY ? 1 : rates[toCurrency];
  if (!fromRate || !toRate) return amount;
  const amountInBase = fromCurrency === BASE_CURRENCY ? amount : amount / fromRate;
  return toCurrency === BASE_CURRENCY ? amountInBase : amountInBase * toRate;
}

export function formatMoney(amount: number, currencyCode: string, symbol?: string): string {
  const sym = symbol ?? getCurrencySymbol(currencyCode);
  const formatted =
    amount >= 1000
      ? amount.toLocaleString("en-GB", { maximumFractionDigits: 0 })
      : amount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${sym}${formatted}`;
}

async function readStoredRates(): Promise<{ rates: ExchangeRateMap; fetchedAt: Date | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exchange_rates")
    .select("to_currency, rate, fetched_at")
    .eq("from_currency", BASE_CURRENCY)
    .order("fetched_at", { ascending: false });

  if (error || !data?.length) {
    return { rates: { [BASE_CURRENCY]: 1 }, fetchedAt: null };
  }

  const rates: ExchangeRateMap = { [BASE_CURRENCY]: 1 };
  let fetchedAt: Date | null = null;

  for (const row of data) {
    rates[row.to_currency] = Number(row.rate);
    if (!fetchedAt && row.fetched_at) {
      fetchedAt = new Date(row.fetched_at);
    }
  }

  return { rates, fetchedAt };
}

async function fetchAndStoreRates(): Promise<ExchangeRateMap> {
  const response = await fetch(ER_API_URL, { next: { revalidate: 0 } });
  if (!response.ok) {
    throw new Error(`Exchange rate API failed: ${response.status}`);
  }

  const payload = (await response.json()) as ErApiResponse;
  if (payload.result !== "success" || !payload.rates) {
    throw new Error("Invalid exchange rate API response");
  }

  const rates: ExchangeRateMap = { [BASE_CURRENCY]: 1, ...payload.rates };
  const admin = createAdminClient();
  const fetchedAt = new Date().toISOString();

  if (admin) {
    const rows = Object.entries(payload.rates).map(([toCurrency, rate]) => ({
      from_currency: BASE_CURRENCY,
      to_currency: toCurrency,
      rate,
      fetched_at: fetchedAt
    }));

    await admin.from("exchange_rates").delete().eq("from_currency", BASE_CURRENCY);
    await admin.from("exchange_rates").insert(rows);
  }

  return rates;
}

async function getExchangeRatesUncached(): Promise<ExchangeRateMap> {
  try {
    const { rates, fetchedAt } = await readStoredRates();
    const isFresh =
      fetchedAt !== null && Date.now() - fetchedAt.getTime() < FRESH_MS;

    if (isFresh && Object.keys(rates).length > 1) {
      return rates;
    }

    return await fetchAndStoreRates();
  } catch {
    const { rates } = await readStoredRates();
    if (Object.keys(rates).length > 1) return rates;
    return { [BASE_CURRENCY]: 1, GBP: 0.00052, USD: 0.00065, EUR: 0.0006 };
  }
}

export const getExchangeRates = cache(getExchangeRatesUncached);

export interface BuyerLocation {
  countryCode: string | null;
  countryName: string;
  /** Compact name for small spaces (UK, USA, UAE…). */
  shortName: string;
  /** Display currency for prices (always one we have an exchange rate for). */
  currency: string;
  symbol: string;
  /** account = from the buyer's settings; detected = from their connection. */
  source: "account" | "detected" | "default";
  signedIn: boolean;
}

/**
 * Where the viewer is and which currency to show prices in:
 * 1. a signed-in buyer's chosen country (Settings → Your country);
 * 2. otherwise the country Vercel detects from their connection, so visitors
 *    who aren't signed in see their own currency too;
 * 3. otherwise the United Kingdom / GBP.
 */
async function getBuyerLocationUncached(): Promise<BuyerLocation> {
  let signedIn = false;
  let countryCode: string | null = null;
  let currency: string | null = null;
  let source: BuyerLocation["source"] = "default";

  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (user) {
      signedIn = true;
      const { data: profile } = await supabase
        .from("users")
        .select("country_code, detected_currency")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.country_code && countryByCode(profile.country_code)) {
        countryCode = profile.country_code;
        currency = profile.detected_currency ?? currencyForCountryCode(countryCode);
        source = "account";
      }
    }
  } catch {
    /* fall back to detection */
  }

  if (!countryCode) {
    try {
      const detected = (await headers()).get("x-vercel-ip-country")?.toUpperCase() ?? null;
      if (detected && countryByCode(detected)) {
        countryCode = detected;
        currency = currencyForCountryCode(detected);
        source = "detected";
      }
    } catch {
      /* no request context (e.g. build time) */
    }
  }

  if (!countryCode) {
    countryCode = "GB";
    currency = "GBP";
  }

  // No exchange rate for this currency (rare): show USD rather than unconverted naira.
  try {
    const rates = await getExchangeRates();
    if (currency && currency !== BASE_CURRENCY && !rates[currency]) currency = "USD";
  } catch {
    /* keep currency */
  }

  const finalCurrency = currency ?? "GBP";
  return {
    countryCode,
    countryName: countryByCode(countryCode)?.name ?? "United Kingdom",
    shortName: countryShortName(countryCode) || "UK",
    currency: finalCurrency,
    symbol: getCurrencySymbol(finalCurrency).trim(),
    source,
    signedIn
  };
}

export const getBuyerLocation = cache(getBuyerLocationUncached);

export const getBuyerCurrency = cache(async (): Promise<string> => {
  return (await getBuyerLocation()).currency;
});
