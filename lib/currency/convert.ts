export function convertCurrency(amount: number, rate: number) {
  return Number((amount * rate).toFixed(2));
}
