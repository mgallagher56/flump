import { calculateDebtSchedule, type DebtItem } from "@flump/finance-engine";
import {
  balanceOf,
  PICTURE,
  SAMPLE,
  SAMPLE_ACCOUNTS,
  SAMPLE_BUDGET,
  SAMPLE_SALARY,
} from "../shared/sampleData";

/*
 * The figures for prototype 10's two scenes (pay and debt), copied from prototype 5's data.ts and
 * trimmed to what they use. Derived from the one sample household, so server and browser agree.
 */

const num = (value: unknown) => Number(value ?? 0);
const salary = SAMPLE_SALARY ?? 0;

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

const longMonthYear = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const monthDate = (year: number, monthIndex: number) => new Date(Date.UTC(year, monthIndex, 15));

/** The month the sample's figures are "now". Fixed, so the server and browser agree. */
const NOW = { year: 2026, month: 10 };

/**
 * The card and the loan at their minimum payments, through the engine's own payoff schedule
 * (highest rate first). The mortgage is not in the payoff set, as in the app.
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
