import {
  buildFinancialPicture,
  SAMPLE_HOUSEHOLDS,
  type SampleHousehold,
} from "@flump/finance-engine";
import { breathingRoomValue } from "@repo/ui";

/**
 * The hero's sample household: the engine's "homeowner" sample, the same fixture the interactive
 * preview offers, run through the engine. Every figure the hero shows (the dashboard, its "Made
 * from" rows and the six pieces) is read from here once, so a piece and its row cannot drift. All
 * are labelled "Example" and shown in neutral text: no status colours, debt never red (MK6).
 */
type Fixture = SampleHousehold["fixture"];

const balanceOf = (a?: { balance?: unknown }) => Number(a?.balance ?? 0);
const sum = (entries: readonly { amount: number }[]) =>
  entries.reduce((total, entry) => total + entry.amount, 0);

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});
const formatGbp = (value: number) => gbp.format(value);

const percentFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });
const percent = (value: unknown) =>
  value === undefined || value === null ? "" : `${percentFormat.format(Number(value))}%`;

const monthYear = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
/**
 * "September 2028" from "2028-09-30": a fixed sample date, read as its year and month in UTC, so
 * no clock or time zone can move it. A date with no month ("2030") reads as January.
 */
const formatMonthYear = (isoDate: string) => {
  const [year = 2026, month = 1] = isoDate.split("-").map(Number);
  return monthYear.format(new Date(Date.UTC(year, month - 1, 15)));
};

/**
 * Every figure the hero shows for a sample household, run through the engine. A missing account
 * or rate reads as £0 or blank; a figure the engine does not know is null.
 */
export function heroFiguresFor(fixture: Fixture) {
  const picture = buildFinancialPicture(fixture);
  const account = (type: string) => fixture.accounts.find((a) => a.type === type);
  const savings = account("Saving");
  const pension = account("Pension");
  const mortgage = account("Mortgage");
  const card = account("Credit Card");
  const home = account("Property");
  const loan = account("Loan");
  const comesIn = sum(fixture.budget.filter((entry) => entry.isIncome));
  const goesOut = sum(fixture.budget.filter((entry) => !entry.isIncome));
  const salary = Number(fixture.profile.annualSalary ?? 0);
  return {
    savings: formatGbp(balanceOf(savings)),
    savingsRate: `${percent(savings?.interestRate)} AER`,
    salary: formatGbp(salary),
    grossMonthly: formatGbp(Math.round(salary / 12)),
    netMonthly: formatGbp(comesIn),
    comesIn: formatGbp(comesIn),
    goesOut: formatGbp(goesOut),
    leftOver: formatGbp(comesIn - goesOut),
    mortgage: formatGbp(balanceOf(mortgage)),
    mortgageRate: percent(mortgage?.interestRate),
    fixedUntil: mortgage?.fixedRateEndDate ? formatMonthYear(mortgage.fixedRateEndDate) : "",
    pension: formatGbp(balanceOf(pension)),
    card: formatGbp(balanceOf(card)),
    cardRate: `${percent(card?.interestRate)} APR`,
    cardMonthly: formatGbp(Number(card?.monthlyContribution ?? 0)),
    home: formatGbp(balanceOf(home)),
    loan: formatGbp(balanceOf(loan)),
    netWorth: formatGbp(picture.netWorth.netWorth),
    leftOverMonthly:
      picture.budget.status === "known" ? formatGbp(picture.budget.value.surplus) : null,
    breathingRoom:
      picture.monthsOfCover.status === "known"
        ? breathingRoomValue(picture.monthsOfCover.value.months)
        : null,
  } as const;
}

/** The hero's figures: the engine's "homeowner" sample. */
export const HERO_FIGURES = heroFiguresFor(SAMPLE_HOUSEHOLDS.homeowner.fixture);

export type PieceKey = "card" | "pension" | "payslip" | "receipt" | "statement" | "credit";

export interface HeroSource {
  readonly key: PieceKey;
  readonly name: string;
  readonly figure: string;
  readonly detail: string;
}

/** The "Made from" rows, in the order their pieces arrive. */
export const HERO_SOURCES: readonly HeroSource[] = [
  {
    key: "card",
    name: "Cash and savings",
    figure: HERO_FIGURES.savings,
    detail: HERO_FIGURES.savingsRate,
  },
  {
    key: "pension",
    name: "Pension",
    figure: HERO_FIGURES.pension,
    detail: "Workplace and personal",
  },
  {
    key: "payslip",
    name: "Salary",
    figure: HERO_FIGURES.salary,
    detail: `${HERO_FIGURES.netMonthly} a month after tax`,
  },
  {
    key: "receipt",
    name: "Budget",
    figure: `${HERO_FIGURES.leftOver} left`,
    detail: `${HERO_FIGURES.comesIn} in, ${HERO_FIGURES.goesOut} out`,
  },
  {
    key: "statement",
    name: "Mortgage",
    figure: HERO_FIGURES.mortgage,
    detail: `${HERO_FIGURES.mortgageRate}, fixed until ${HERO_FIGURES.fixedUntil}`,
  },
  {
    key: "credit",
    name: "Credit card",
    figure: HERO_FIGURES.card,
    detail: HERO_FIGURES.cardRate,
  },
];
