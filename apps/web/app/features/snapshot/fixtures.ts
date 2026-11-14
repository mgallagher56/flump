/**
 * Illustrative fixtures for snapshot stories and the E2E harness. Example figures only; no real
 * data.
 */
export const EXAMPLE_ACCOUNTS = [
  {
    id: "a0000000-0000-4000-8000-000000000001",
    name: "Current account",
    type: "Current",
    balance: 1850,
  },
  { id: "a0000000-0000-4000-8000-000000000002", name: "Stocks ISA", type: "ISA", balance: 14200 },
  {
    id: "a0000000-0000-4000-8000-000000000003",
    name: "Mortgage",
    type: "Mortgage",
    balance: -172400,
  },
  {
    id: "a0000000-0000-4000-8000-000000000004",
    name: "Joint account",
    type: "Current",
    balance: 960,
    connectionId: "c0000000-0000-4000-8000-000000000001",
  },
];

const [current, isa, mortgage, joint] = EXAMPLE_ACCOUNTS.map((a) => a.id) as [
  string,
  string,
  string,
  string,
];

const month = (accountId: string, ym: string, value: number) => ({
  accountId,
  year: Number(ym.slice(0, 4)),
  month: Number(ym.slice(5, 7)),
  value,
});

/** Example months up to October 2026, with August skipped (a carried-forward gap). */
export function exampleDetails(months: readonly string[]) {
  return months.flatMap((ym, i) => [
    month(current, ym, 1500 + i * 70),
    month(isa, ym, 12000 + i * 310),
    month(mortgage, ym, -(175000 - i * 430)),
    month(joint, ym, 900 + i * 10),
  ]);
}

export const ONE_MONTH = ["2026-10"];
export const TWO_MONTHS = ["2026-09", "2026-10"];
export const TREND_MONTHS = [
  "2025-11",
  "2025-12",
  "2026-01",
  "2026-02",
  "2026-03",
  "2026-04",
  "2026-05",
  "2026-06",
  "2026-07",
  "2026-09",
  "2026-10",
];

/**
 * The account-by-account check-in (R2-5): a current account, a credit card, an ISA and a
 * mortgage with a rate and payment (so its figure is calculated). October 2026 is recorded.
 */
export const CHECK_IN_ACCOUNTS = [
  {
    id: "b0000000-0000-4000-8000-000000000001",
    name: "Everyday account",
    type: "Current",
    balance: 3360,
  },
  {
    id: "b0000000-0000-4000-8000-000000000002",
    name: "Stocks ISA",
    type: "Investment",
    balance: 14200,
  },
  {
    id: "b0000000-0000-4000-8000-000000000003",
    name: "Residential mortgage",
    type: "Mortgage",
    balance: -186550,
    interestRate: 4.5,
    monthlyContribution: 1250,
  },
  {
    id: "b0000000-0000-4000-8000-000000000004",
    name: "Credit card",
    type: "Credit Card",
    balance: -640,
  },
];

export const CHECK_IN_DETAILS = [
  { accountId: CHECK_IN_ACCOUNTS[0]?.id, year: 2026, month: 10, value: 3360, source: "manual" },
  { accountId: CHECK_IN_ACCOUNTS[1]?.id, year: 2026, month: 10, value: 14200, source: "manual" },
  { accountId: CHECK_IN_ACCOUNTS[2]?.id, year: 2026, month: 10, value: -186550, source: "manual" },
  { accountId: CHECK_IN_ACCOUNTS[3]?.id, year: 2026, month: 10, value: -640, source: "manual" },
];
