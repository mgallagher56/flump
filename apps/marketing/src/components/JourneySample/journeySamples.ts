import {
  buildFinancialPicture,
  calculateDebtSchedule,
  type DebtItem,
  SAMPLE_HOUSEHOLDS,
} from "@flump/finance-engine";

/*
 * Every figure the journey's samples show, from one sample household: the engine's "homeowner",
 * the same fixture the interactive preview offers. Pure data (no React), so the server render and
 * the browser agree to the penny. Ported from prototype 11 (`shared/sampleData.ts` and
 * `p8/sceneData.ts`). Every figure is labelled "Example" where it is shown, in neutral ink: no
 * status colours, nothing celebrated, debt never red or rose (MK6).
 */

const SAMPLE = SAMPLE_HOUSEHOLDS.homeowner;
const FIXTURE = SAMPLE.fixture;
const PICTURE = buildFinancialPicture(FIXTURE);

/** An account's balance as a number (fixture balances may be typed loosely). */
const balanceOf = (a?: { balance?: unknown }) => Number(a?.balance ?? 0);
const num = (value: unknown) => Number(value ?? 0);
const account = (type: string) => FIXTURE.accounts.find((a) => a.type === type);

const ACCOUNTS = {
  savings: account("Saving"),
  pension: account("Pension"),
  home: account("Property"),
  mortgage: account("Mortgage"),
  creditCard: account("Credit Card"),
  loan: account("Loan"),
} as const;

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});
const gbpPence = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const oneDecimal = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });
const shortMonth = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });
const longMonthYear = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** £12,345 */
export const formatGbp = (value: number) => gbp.format(Math.round(value));
/** £12,300: to the nearest hundred, as the Home page shows net worth. */
export const formatGbpHundreds = (value: number) => gbp.format(Math.round(value / 100) * 100);
/** £1,234.56 */
export const formatGbpPence = (value: number) => gbpPence.format(value);
/** 4.5 months */
export const formatMonths = (value: number) =>
  `${oneDecimal.format(Math.round(value * 10) / 10)} months`;

const monthDate = (year: number, monthIndex: number) => new Date(Date.UTC(year, monthIndex, 15));
/** The month the sample's figures are "now". Fixed, so the server and browser agree. */
const NOW = { year: 2026, month: 10 }; // November 2026 (months count from 0)

type BudgetEntry = (typeof FIXTURE.budget)[number];
const sum = (entries: readonly BudgetEntry[]) =>
  entries.reduce((total, entry) => total + entry.amount, 0);
const income = FIXTURE.budget.filter((entry) => entry.isIncome);
const outgoings = FIXTURE.budget.filter((entry) => !entry.isIncome);

/** The Home page's three figures, from the engine (null when the engine does not know one). */
export const SAMPLE_HOME = {
  netWorth: PICTURE.netWorth.netWorth,
  leftOverMonthly: PICTURE.budget.status === "known" ? PICTURE.budget.value.surplus : null,
  monthsOfCover:
    PICTURE.monthsOfCover.status === "known" ? PICTURE.monthsOfCover.value.months : null,
} as const;

/** The six account cards, what you have first, then what you owe. */
export const SAMPLE_ACCOUNT_CARDS = [
  { id: "cash", name: "Cash and savings", amount: balanceOf(ACCOUNTS.savings), owed: false },
  { id: "pension", name: "Pension", amount: balanceOf(ACCOUNTS.pension), owed: false },
  { id: "home", name: "Home (your estimate)", amount: balanceOf(ACCOUNTS.home), owed: false },
  { id: "mortgage", name: "Mortgage", amount: balanceOf(ACCOUNTS.mortgage), owed: true },
  { id: "card", name: "Credit card", amount: balanceOf(ACCOUNTS.creditCard), owed: true },
  { id: "loan", name: "Personal loan", amount: balanceOf(ACCOUNTS.loan), owed: true },
] as const;

/** Budget: each outgoing as a share of what comes in, laid end to end along one bar. */
export const SAMPLE_BUDGET = (() => {
  const comesIn = sum(income);
  let start = 0;
  const segments = outgoings.map((entry) => {
    const share = comesIn > 0 ? entry.amount / comesIn : 0;
    const segment = { id: entry.id, label: entry.name, amount: entry.amount, start, share };
    start += share;
    return segment;
  });
  return { comesIn, leftOver: comesIn - sum(outgoings), segments, leftOverStart: start };
})();

/** The payslip: the engine's take-home breakdown for the sample salary, one month of it. */
export const SAMPLE_PAYSLIP = (() => {
  const salary = FIXTURE.profile.annualSalary ?? 0;
  const takeHome = PICTURE.takeHome.status === "known" ? PICTURE.takeHome.value : null;
  const month = (annual: number | null | undefined) => (annual ?? 0) / 12;
  const gross = salary / 12;
  const rows = [
    { id: "tax", label: "Income Tax", amount: month(takeHome?.incomeTax) },
    { id: "ni", label: "National Insurance", amount: month(takeHome?.nationalInsurance) },
    {
      id: "pension",
      label: `Pension (${FIXTURE.profile.pensionPercent}%)`,
      amount: month(takeHome?.pension),
    },
  ];
  const net = gross - rows.reduce((total, row) => total + row.amount, 0);
  return { salary, gross, rows, net };
})();

/** A point on a sample chart: its value and the words a reader gets for it. */
export interface ChartPoint {
  readonly value: number;
  readonly label: string;
}

/**
 * Example cash savings for the 12 months to now, ending at the fixture's savings balance. Worked
 * back from today: each month adds the budget's cash saving and a month of interest at the
 * account's AER, and in August £1,200 was taken out. Illustrative history, not a forecast.
 */
export const SAMPLE_SAVINGS = (() => {
  const end = balanceOf(ACCOUNTS.savings);
  const rate = num(ACCOUNTS.savings?.interestRate) / 100 / 12;
  const saving = outgoings.find((o) => o.name === "Cash saving")?.amount ?? 0;
  const withdrawal = 1200;
  const withdrawalMonth = 7; // August
  const values: number[] = [end];
  for (let i = 1; i < 12; i++) {
    const thisMonth = (NOW.month - (i - 1) + 12) % 12;
    const later = values[0] ?? end;
    const out = thisMonth === withdrawalMonth ? withdrawal : 0;
    values.unshift((later - saving + out) / (1 + rate));
  }
  const points = values.map((value, i) => {
    const date = monthDate(NOW.year, NOW.month + i - 11);
    return {
      value: Math.round(value),
      label: `${longMonthYear.format(date)}: ${formatGbp(value)}`,
      tick: shortMonth.format(date),
    };
  });
  return { points, end, saving, withdrawal };
})();

/**
 * The card and the loan at their minimum payments, through the engine's own payoff schedule
 * (highest rate first; when the card clears, its payment moves to the loan). The mortgage is not
 * in the payoff set, as in the app.
 */
export const SAMPLE_DEBT = (() => {
  const debts: DebtItem[] = [ACCOUNTS.creditCard, ACCOUNTS.loan]
    .filter((a) => a !== undefined)
    .map((a) => ({
      id: a.id ?? "debt",
      name: a.name ?? "Debt",
      balanceGbp: balanceOf(a),
      interestRateApr: num(a.interestRate),
      minimumPaymentGbp: num(a.monthlyContribution),
      debtType: a.type === "Loan" ? "loan_personal" : "credit_card",
    }));
  const start = debts.reduce((total, d) => total + (d.balanceGbp ?? 0), 0);
  const monthly = debts.reduce((total, d) => total + (d.minimumPaymentGbp ?? 0), 0);
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
    label: `${longMonthYear.format(p.date)}: ${formatGbp(p.value)}`,
    tick: String(p.date.getUTCFullYear()),
  }));
  const startLabel = longMonthYear.format(monthDate(NOW.year, NOW.month));
  const last = result.schedule.at(-1);
  const endLabel = last ? longMonthYear.format(ym(last.calendarDate)) : startLabel;
  const fixedEnd = ACCOUNTS.mortgage?.fixedRateEndDate;
  // A fixed sample date, read as its year and month (no clock and no time zone involved).
  const fixedEndLabel = fixedEnd ? longMonthYear.format(ym(fixedEnd)) : null;
  return { start, monthly, points, startLabel, endLabel, fixedEndLabel };
})();

/** The chart box the sample lines are drawn on (SVG user units). */
export const CHART_BOX = { width: 600, height: 200 } as const;

/** An SVG polyline path for values on the chart box, from `min` at the bottom to `max` at the top. */
export function linePath(values: readonly number[], max: number, min = 0): string {
  const { width, height } = CHART_BOX;
  const step = width / Math.max(1, values.length - 1);
  const span = max - min || 1;
  return values
    .map(
      (v, i) =>
        `${i === 0 ? "M" : "L"}${(i * step).toFixed(2)},${(height - ((v - min) / span) * height).toFixed(2)}`,
    )
    .join(" ");
}

/** The y of a value on the chart box. */
export const chartY = (value: number, max: number, min = 0) =>
  CHART_BOX.height - ((value - min) / (max - min || 1)) * CHART_BOX.height;
