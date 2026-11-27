import type { TaxRatesStatusBannerProps } from "./TaxRatesStatusBanner";

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const taxRatesStatusBannerStates = {
  provisional: {
    rates: {
      calendarYear: "2027/28",
      ratesYear: "2027/28",
      isFallback: false,
      kind: "provisional",
    },
  },
  fallback: {
    rates: { calendarYear: "2028/29", ratesYear: "2027/28", isFallback: true },
  },
  otherYear: {
    rates: { calendarYear: "2027/28", ratesYear: "2026/27", isFallback: false },
  },
  confirmed: {
    rates: { calendarYear: "2026/27", ratesYear: "2026/27", isFallback: false },
  },
} satisfies Record<string, TaxRatesStatusBannerProps>;
