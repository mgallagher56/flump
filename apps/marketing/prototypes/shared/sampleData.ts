import { buildFinancialPicture, SAMPLE_HOUSEHOLDS } from "@flump/finance-engine";

/**
 * One sample household for prototypes 4 to 7: the engine's "homeowner" sample, the same fixture the
 * interactive preview offers. Every figure shown in these prototypes comes from here, is labelled
 * "Example", and is shown in neutral text (no status colours, nothing celebrated, debt never red).
 */
export const SAMPLE = SAMPLE_HOUSEHOLDS.homeowner;
const FIXTURE = SAMPLE.fixture;
export const PICTURE = buildFinancialPicture(FIXTURE);

const account = (type: string) => FIXTURE.accounts.find((a) => a.type === type);

export const SAMPLE_ACCOUNTS = {
  savings: account("Saving"),
  pension: account("Pension"),
  home: account("Property"),
  mortgage: account("Mortgage"),
  creditCard: account("Credit Card"),
  loan: account("Loan"),
} as const;

type BudgetEntry = (typeof FIXTURE.budget)[number];
const income = FIXTURE.budget.filter((entry) => entry.isIncome);
const outgoings = FIXTURE.budget.filter((entry) => !entry.isIncome);
const sum = (entries: readonly BudgetEntry[]) =>
  entries.reduce((total, entry) => total + entry.amount, 0);

/** Monthly budget, from the fixture's own entries. */
export const SAMPLE_BUDGET = {
  comesIn: sum(income),
  goesOut: sum(outgoings),
  leftOver: sum(income) - sum(outgoings),
  outgoings: outgoings.map((e) => ({ id: e.id, label: e.name, amount: e.amount })),
} as const;

/** The dashboard's three figures, from the engine (null when the engine does not know one). */
export const SAMPLE_DASHBOARD = {
  netWorth: PICTURE.netWorth.netWorth,
  leftOverMonthly: PICTURE.budget.status === "known" ? PICTURE.budget.value.surplus : null,
  monthsOfCover:
    PICTURE.monthsOfCover.status === "known" ? PICTURE.monthsOfCover.value.months : null,
} as const;

export const SAMPLE_SALARY = FIXTURE.profile.annualSalary;

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

export const formatGbp = (value: number) => gbp.format(value);

const monthYear = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "Europe/London",
});

/** "September 2028" from "2028-09-30". */
export const formatMonthYear = (isoDate: string) =>
  monthYear.format(new Date(`${isoDate}T12:00:00Z`));

/** An account's balance as a number (fixture balances may be typed loosely). */
export const balanceOf = (a?: { balance?: unknown }) => Number(a?.balance ?? 0);
