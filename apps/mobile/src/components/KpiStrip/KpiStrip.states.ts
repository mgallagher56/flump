import type { KpiStripProps } from "./KpiStrip";

const noop = () => {};
const links = { onAddBudget: noop, onAddSpending: noop } as const;

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const kpiStripStates = {
  /** The renter of personas.ts: £125 left over, £1,800 on the credit card. */
  twoFigures: {
    ...links,
    strip: {
      first: { kind: "leftOver", figure: 125, leavesOut: null },
      second: { kind: "owed", figure: 1800 },
      collapsed: false,
      ratesNotice: null,
    },
  },
  short: {
    ...links,
    strip: {
      first: { kind: "short", figure: -240, leavesOut: null },
      second: { kind: "owed", figure: 1800 },
      collapsed: false,
      ratesNotice: null,
    },
  },
  incomeOnly: {
    ...links,
    strip: {
      first: { kind: "incomeOnly", figure: 2085, leavesOut: null },
      second: { kind: "pension", figure: 9000 },
      collapsed: false,
      ratesNotice: null,
    },
  },
  prompt: {
    ...links,
    strip: {
      first: { kind: "unset" },
      second: { kind: "owed", figure: 1800 },
      collapsed: true,
      ratesNotice: null,
    },
  },
  refused: {
    ...links,
    strip: {
      first: {
        kind: "refused",
        notice:
          "Scottish Income Tax rates for 2027/28 are not published yet, so there is no estimate for this year.",
      },
      second: { kind: "owed", figure: 1800 },
      collapsed: false,
      ratesNotice: null,
    },
  },
  pension: {
    ...links,
    strip: {
      first: { kind: "leftOver", figure: 125, leavesOut: null },
      second: { kind: "pension", figure: 9000 },
      collapsed: false,
      ratesNotice: null,
    },
  },
  leavesOut: {
    ...links,
    strip: {
      first: {
        kind: "leftOver",
        figure: 147,
        leavesOut:
          "The 2027/28 repayment threshold for this student loan plan is not published yet, so repayments are not included.",
      },
      second: { kind: "none" },
      collapsed: false,
      ratesNotice: null,
    },
  },
  loading: { ...links, loading: true },
} satisfies Record<string, KpiStripProps>;
