import { ALL_COUNTRIES, type CountryInfo } from "./countries";

const BY_CODE = new Map(ALL_COUNTRIES.map((c) => [c.code, c]));

/** Shown first in the picker: core diaspora markets, then home markets. */
export const POPULAR_COUNTRY_CODES = [
  "GB", "US", "CA", "AU", "IE", "DE", "NL", "FR", "IT", "AE",
  "NG", "GH", "KE", "ZA"
];

/** Extra words people type for a country, so search finds it. */
export const COUNTRY_ALIASES: Record<string, string[]> = {
  GB: ["uk", "britain", "great britain", "england", "scotland", "wales", "northern ireland"],
  US: ["usa", "america", "united states of america"],
  AE: ["uae", "dubai", "abu dhabi", "emirates"],
  NL: ["holland", "dutch"],
  CD: ["drc", "congo kinshasa", "democratic republic of the congo"],
  CG: ["congo brazzaville", "republic of the congo"],
  CI: ["ivory coast", "cote d'ivoire", "cote divoire"],
  SA: ["ksa", "saudi"],
  KR: ["south korea", "korea"],
  CZ: ["czech republic"],
  TR: ["turkey", "türkiye"]
};

export function countryByCode(code: string | null | undefined): CountryInfo | null {
  return code ? BY_CODE.get(code.toUpperCase()) ?? null : null;
}

export function isKnownCountry(code: string | null | undefined): boolean {
  return Boolean(countryByCode(code));
}

/** Display currency for a buyer. "OT" is the old "Other" option → USD. */
export function currencyForCountryCode(code: string | null | undefined): string {
  return countryByCode(code)?.currency ?? "USD";
}

export { ALL_COUNTRIES };
