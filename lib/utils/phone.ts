import { DIAL_CODES } from "@/lib/data/dial-codes";

/** When several countries share a dialling code, which one a pasted number maps to. */
const PREFERRED_FOR_DIAL: Record<string, string> = {
  "+1": "US",
  "+7": "RU",
  "+44": "GB",
  "+47": "NO",
  "+61": "AU",
  "+212": "MA",
  "+262": "RE",
  "+290": "SH",
  "+358": "FI",
  "+590": "GP",
  "+599": "CW"
};

/** Countries where the leading 0 is part of the international number. */
const KEEP_LEADING_ZERO = new Set(["IT", "SM", "VA"]);

export function dialCodeFor(countryCode: string): string {
  return DIAL_CODES[countryCode] ?? "";
}

/** Flag emoji from an ISO 3166-1 alpha-2 code. */
export function flagFor(countryCode: string): string {
  if (!/^[A-Z]{2}$/.test(countryCode)) return "🏳️";
  return String.fromCodePoint(...[...countryCode].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/**
 * The national part of a number as digits, without the trunk "0" most
 * countries use for local dialling (07405… in the UK, 0803… in Nigeria).
 */
export function nationalDigits(countryCode: string, input: string): string {
  const digits = input.replace(/\D/g, "");
  return KEEP_LEADING_ZERO.has(countryCode) ? digits : digits.replace(/^0+/, "");
}

/** International (E.164) form, e.g. +447405123456. */
export function toE164(countryCode: string, input: string): string {
  return `${dialCodeFor(countryCode)}${nationalDigits(countryCode, input)}`;
}

/** E.164 allows at most 15 digits; most real numbers have at least 7. */
export function isPlausiblePhone(countryCode: string, input: string): boolean {
  const national = nationalDigits(countryCode, input);
  const total = dialCodeFor(countryCode).replace(/\D/g, "").length + national.length;
  return Boolean(dialCodeFor(countryCode)) && national.length >= 6 && total <= 15;
}

/**
 * For a pasted or typed international number ("+44 7405…", "00234 803…"),
 * the country and remaining digits. Returns null if it isn't international.
 */
export function splitInternational(
  input: string,
  currentCountry?: string
): { countryCode: string; rest: string } | null {
  const trimmed = input.trim();
  let digits: string;
  if (trimmed.startsWith("+")) digits = trimmed.slice(1).replace(/\D/g, "");
  else if (trimmed.startsWith("00")) digits = trimmed.slice(2).replace(/\D/g, "");
  else return null;
  if (!digits) return null;

  // Longest matching dialling code wins (+1 vs +1876 etc.).
  for (let len = Math.min(4, digits.length); len >= 1; len--) {
    const dial = `+${digits.slice(0, len)}`;
    const matches = Object.keys(DIAL_CODES).filter((code) => DIAL_CODES[code] === dial);
    if (matches.length) {
      const countryCode =
        currentCountry && matches.includes(currentCountry)
          ? currentCountry
          : PREFERRED_FOR_DIAL[dial] ?? matches[0];
      return { countryCode, rest: digits.slice(len) };
    }
  }
  return null;
}
