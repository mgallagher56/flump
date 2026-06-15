import { useUserProfile } from "./useUserProfile";

export function getCurrencySymbol(curr: string): string {
  switch (curr) {
    case "USD":
    case "CAD":
    case "AUD":
    case "NZD":
    case "SGD":
      return "$";
    case "EUR":
      return "€";
    case "JPY":
      return "¥";
    case "INR":
      return "₹";
    case "ZAR":
      return "R";
    case "CHF":
      return "CHF";
    default:
      return "£";
  }
}

export function useFormatCurrency() {
  const { profile } = useUserProfile();
  const currency = profile?.currency || "GBP";

  const getLocale = (curr: string) => {
    switch (curr) {
      case "USD":
        return "en-US";
      case "EUR":
        return "de-DE";
      case "AUD":
        return "en-AU";
      case "CAD":
        return "en-CA";
      case "NZD":
        return "en-NZ";
      case "JPY":
        return "ja-JP";
      case "INR":
        return "en-IN";
      case "ZAR":
        return "en-ZA";
      case "SGD":
        return "en-SG";
      case "CHF":
        return "de-CH";
      default:
        return "en-GB";
    }
  };

  const formatCurrency = (val: number, options?: Intl.NumberFormatOptions) => {
    return Intl.NumberFormat(getLocale(currency), {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 0,
      ...options,
    }).format(val);
  };

  const formatCurrencyDecimal = (val: number, options?: Intl.NumberFormatOptions) => {
    return Intl.NumberFormat(getLocale(currency), {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 2,
      ...options,
    }).format(val);
  };

  return {
    formatCurrency,
    formatCurrencyDecimal,
    currency,
    symbol: getCurrencySymbol(currency),
  };
}
