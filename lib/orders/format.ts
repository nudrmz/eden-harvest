/** Client-safe helpers for showing order money and dates. */
export function money(amount: number | string | null | undefined, currency = "NGN"): string {
  const n = Number(amount ?? 0);
  try {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString("en-GB")}`;
  }
}

export function when(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London"
  });
}
