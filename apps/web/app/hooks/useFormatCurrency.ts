/**
 * Flump is UK-only (E16 D6-B): every amount is GBP, formatted for en-GB, whatever the stored
 * profile currency column says.
 */
const CURRENCY = "GBP";
const LOCALE = "en-GB";

export function useFormatCurrency() {
  const formatCurrency = (val: number, options?: Intl.NumberFormatOptions) =>
    Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency: CURRENCY,
      maximumFractionDigits: 0,
      ...options,
    }).format(val);

  const formatCurrencyDecimal = (val: number, options?: Intl.NumberFormatOptions) =>
    Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency: CURRENCY,
      maximumFractionDigits: 2,
      ...options,
    }).format(val);

  return {
    formatCurrency,
    formatCurrencyDecimal,
    currency: CURRENCY,
    symbol: "£",
  };
}
