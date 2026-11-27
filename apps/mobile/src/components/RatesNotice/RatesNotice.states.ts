import type { RatesNoticeProps } from "./RatesNotice";

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const ratesNoticeStates = {
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
} satisfies Record<string, RatesNoticeProps>;
