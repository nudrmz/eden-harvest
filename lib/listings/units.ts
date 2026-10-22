/**
 * Selling units for listings, and the optional size of one unit.
 *
 * A listing's `unit` column holds the unit buyers pay for, e.g. "bag". When
 * the seller says how much is in one, it's stored in the same column as
 * "bag (50 kg)", because the database can't take a new column right now.
 * Everything that shows a unit goes through these helpers, so moving the
 * size to its own column later only means changing this file.
 *
 * The minimum order is always counted in the same unit as the price
 * ("2 bags"). The old form saved every minimum as "kg" whatever the unit, so
 * min_order_unit is no longer trusted for display.
 */

/** Weight/volume units: they already say how much, so they need no size. */
export const MEASURE_UNITS = ["kg", "tonne", "litre"] as const;

/** Containers and counts: buyers need to know how much is in one. */
export const COUNT_UNITS = [
  "bag",
  "crate",
  "carton",
  "basin",
  "jerrycan",
  "paint bucket",
  "tuber",
  "piece"
] as const;

export const LISTING_UNITS: string[] = [...MEASURE_UNITS, ...COUNT_UNITS];

/** What the size of one unit can be measured in. */
export const SIZE_MEASURES = ["kg", "g", "litre", "tonne"] as const;
export type SizeMeasure = (typeof SIZE_MEASURES)[number];

export interface UnitSize {
  amount: number;
  measure: SizeMeasure;
}

export interface ParsedUnit {
  /** The unit itself, e.g. "bag". */
  base: string;
  size: UnitSize | null;
}

const SIZE_RE = /^(.*?)\s*\(\s*(\d+(?:\.\d+)?)\s*(kg|g|litre|litres|l|tonne|tonnes)\s*\)\s*$/i;

function normaliseMeasure(raw: string): SizeMeasure {
  const m = raw.toLowerCase();
  if (m === "l" || m.startsWith("litre")) return "litre";
  if (m.startsWith("tonne")) return "tonne";
  return m === "g" ? "g" : "kg";
}

export function parseUnit(unit: string | null | undefined): ParsedUnit {
  const text = (unit ?? "").trim();
  const match = SIZE_RE.exec(text);
  if (!match) return { base: text || "unit", size: null };
  const amount = Number(match[2]);
  return {
    base: match[1].trim() || "unit",
    size: amount > 0 ? { amount, measure: normaliseMeasure(match[3]) } : null
  };
}

/** True for units where "how much is in one?" makes sense. */
export function unitNeedsSize(base: string): boolean {
  return !(MEASURE_UNITS as readonly string[]).includes(base.trim().toLowerCase());
}

function formatAmount(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : String(Number(amount.toFixed(2)));
}

function formatSize(size: UnitSize): string {
  const plural = size.measure === "litre" || size.measure === "tonne";
  return `${formatAmount(size.amount)} ${size.measure}${plural && size.amount !== 1 ? "s" : ""}`;
}

/** Value saved in listings.unit: "bag" or "bag (50 kg)". */
export function composeUnit(base: string, size: UnitSize | null): string {
  const clean = base.trim();
  if (!size || !(size.amount > 0) || !unitNeedsSize(clean)) return clean;
  return `${clean} (${formatSize(size)})`;
}

/** Shown after the price: "bag (50 kg)", "kg". */
export function priceUnitLabel(unit: string | null | undefined): string {
  const { base, size } = parseUnit(unit);
  return size ? `${base} (${formatSize(size)})` : base;
}

const NO_PLURAL = new Set(["kg", "g"]);

export function pluralise(base: string, count: number): string {
  if (count === 1 || NO_PLURAL.has(base.toLowerCase())) return base;
  if (/(s|x|ch|sh)$/i.test(base)) return `${base}es`;
  return `${base}s`;
}

/** "2 bags", "1 crate", "10 kg". Always in the listing's own unit. */
export function minOrderLabel(quantity: number | string | null | undefined, unit: string | null | undefined): string {
  const qty = Number(quantity);
  const count = Number.isFinite(qty) && qty > 0 ? qty : 1;
  return `${formatAmount(count)} ${pluralise(parseUnit(unit).base, count)}`;
}
