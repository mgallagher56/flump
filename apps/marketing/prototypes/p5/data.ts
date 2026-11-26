import { calculateDebtSchedule, type DebtItem } from "@flump/finance-engine";
import {
  balanceOf,
  PICTURE,
  SAMPLE,
  SAMPLE_ACCOUNTS,
  SAMPLE_BUDGET,
  SAMPLE_DASHBOARD,
  SAMPLE_SALARY,
} from "../shared/sampleData";

/*
 * Every figure prototype 5 shows, derived from the one sample household in shared/sampleData.ts.
 * Pure data, no React, so the server render and the browser agree to the penny.
 */

const balance = balanceOf;
const num = (value: unknown) => Number(value ?? 0);
const salary = SAMPLE_SALARY ?? 0;

/** The six account cards, assets first, then what is owed. `sign` is how each counts in net worth. */
export const ACCOUNT_CARDS = [
  { id: "cash", name: "Cash and savings", amount: balance(SAMPLE_ACCOUNTS.savings), sign: 1 },
  { id: "pension", name: "Pension", amount: balance(SAMPLE_ACCOUNTS.pension), sign: 1 },
  { id: "home", name: "Home (your estimate)", amount: balance(SAMPLE_ACCOUNTS.home), sign: 1 },
  { id: "mortgage", name: "Mortgage", amount: balance(SAMPLE_ACCOUNTS.mortgage), sign: -1 },
  { id: "card", name: "Credit card", amount: balance(SAMPLE_ACCOUNTS.creditCard), sign: -1 },
  { id: "loan", name: "Personal loan", amount: balance(SAMPLE_ACCOUNTS.loan), sign: -1 },
] as const;

/** The net worth after each card is added, ending at the engine's own net worth. */
export const RUNNING_TOTALS = ACCOUNT_CARDS.reduce<number[]>((totals, card) => {
  const previous = totals.at(-1) ?? 0;
  totals.push(previous + card.sign * card.amount);
  return totals;
}, []);

export const NET_WORTH = SAMPLE_DASHBOARD.netWorth;

/** Budget: each outgoing as a share of what comes in, laid end to end. */
export const BUDGET = (() => {
  let start = 0;
  const segments = SAMPLE_BUDGET.outgoings.map((entry) => {
    const share = entry.amount / SAMPLE_BUDGET.comesIn;
    const segment = { ...entry, start, share };
    start += share;
    return segment;
  });
  return {
    comesIn: SAMPLE_BUDGET.comesIn,
    leftOver: SAMPLE_BUDGET.leftOver,
    segments,
    leftOverStart: start,
  };
})();

/** The payslip: the engine's take-home breakdown for the sample salary, one month of it. */
export const PAYSLIP = (() => {
  const th = PICTURE.takeHome.status === "known" ? PICTURE.takeHome.value : null;
  const month = (annual: number | null | undefined) => (annual ?? 0) / 12;
  const gross = salary / 12;
  const rows = [
    { id: "tax", label: "Income Tax", amount: month(th?.incomeTax) },
    { id: "ni", label: "National Insurance", amount: month(th?.nationalInsurance) },
    {
      id: "pension",
      label: `Pension (${SAMPLE.fixture.profile.pensionPercent}%)`,
      amount: month(th?.pension),
    },
  ];
  const net = gross - rows.reduce((sum, row) => sum + row.amount, 0);
  return { salary, gross, rows, net, budgetNet: SAMPLE_BUDGET.comesIn };
})();

const gbpPence = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
export const formatGbpPence = (value: number) => gbpPence.format(value);

const shortMonth = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });
const longMonthYear = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const monthDate = (year: number, monthIndex: number) => new Date(Date.UTC(year, monthIndex, 15));

/** The month the sample's figures are "now". Fixed, so the server and browser agree. */
const NOW = { year: 2026, month: 10 }; // November 2026 (months count from 0)

/**
 * Example savings balances for the 12 months to now, ending at the fixture's savings balance.
 * Worked backwards from today: each month adds the budget's £300 cash saving and a month of
 * interest at the account's AER, and in August £1,200 was taken out. So the month before is
 * (balance - 300 + withdrawal) / (1 + AER / 12). Illustrative history, not a forecast.
 */
export const SAVINGS = (() => {
  const end = balance(SAMPLE_ACCOUNTS.savings);
  const rate = num(SAMPLE_ACCOUNTS.savings?.interestRate) / 100 / 12;
  const saving = SAMPLE_BUDGET.outgoings.find((o) => o.label === "Cash saving")?.amount ?? 0;
  const withdrawalMonth = 7; // August
  const values: number[] = [end];
  for (let i = 1; i < 12; i++) {
    const thisMonth = (NOW.month - (i - 1) + 12) % 12;
    const later = values[0] ?? end;
    const out = thisMonth === withdrawalMonth ? 1200 : 0;
    values.unshift((later - saving + out) / (1 + rate));
  }
  const points = values.map((value, i) => {
    const offset = i - 11;
    const date = monthDate(NOW.year, NOW.month + offset);
    return {
      value: Math.round(value),
      label: shortMonth.format(date),
      long: longMonthYear.format(date),
    };
  });
  return { points, end };
})();

/**
 * The card and the loan, at their minimum payments, through the engine's own payoff schedule
 * (calculateDebtSchedule, highest rate first; when the card clears, its payment moves to the
 * loan). The mortgage is not in the payoff set, as in the app.
 */
export const DEBT = (() => {
  const debts: DebtItem[] = [SAMPLE_ACCOUNTS.creditCard, SAMPLE_ACCOUNTS.loan]
    .filter((a) => a !== undefined)
    .map((a) => ({
      id: a.id ?? "debt",
      name: a.name ?? "Debt",
      balanceGbp: balanceOf(a),
      interestRateApr: num(a.interestRate),
      minimumPaymentGbp: num(a.monthlyContribution),
      debtType: a.type === "Loan" ? "loan_personal" : "credit_card",
    }));
  const start = debts.reduce((sum, d) => sum + (d.balanceGbp ?? 0), 0);
  const monthly = debts.reduce((sum, d) => sum + (d.minimumPaymentGbp ?? 0), 0);
  const result = calculateDebtSchedule(debts, 0, "AVALANCHE", {
    referenceDate: monthDate(NOW.year, NOW.month),
  });
  const ym = (s: string) => {
    const [y, m] = s.split("-").map(Number);
    return monthDate(y ?? NOW.year, (m ?? 1) - 1);
  };
  const points = [
    { value: start, date: monthDate(NOW.year, NOW.month) },
    ...result.schedule.map((row) => ({ value: row.remainingDebtGbp, date: ym(row.calendarDate) })),
  ].map((p) => ({
    value: p.value,
    long: longMonthYear.format(p.date),
    year: p.date.getUTCFullYear(),
    month: p.date.getUTCMonth(),
  }));
  const last = points.at(-1);
  return {
    start,
    monthly,
    months: result.monthsToPayoff,
    endLabel: last?.long ?? "",
    startLabel: points[0]?.long ?? "",
    points,
  };
})();

/** An SVG polyline path for values on a width by height box, from zero at the bottom. */
export function linePath(
  values: readonly number[],
  width: number,
  height: number,
  max: number,
  min = 0,
) {
  const step = width / Math.max(1, values.length - 1);
  return values
    .map(
      (v, i) =>
        `${i === 0 ? "M" : "L"}${(i * step).toFixed(2)},${(height - ((v - min) / (max - min)) * height).toFixed(2)}`,
    )
    .join(" ");
}
