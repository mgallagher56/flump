import { breathingRoomValue } from "@repo/ui";
import {
  balanceOf,
  formatGbp,
  formatMonthYear,
  SAMPLE_ACCOUNTS,
  SAMPLE_BUDGET,
  SAMPLE_DASHBOARD,
  SAMPLE_SALARY,
} from "../../shared/sampleData";

/**
 * Every figure prototype 4 shows, read once from the shared sample household. The pieces, the
 * dashboard and the "made from" rows all read this, so a piece's figure and its row cannot drift.
 */
const savings = SAMPLE_ACCOUNTS.savings;
const pension = SAMPLE_ACCOUNTS.pension;
const mortgage = SAMPLE_ACCOUNTS.mortgage;
const card = SAMPLE_ACCOUNTS.creditCard;
const home = SAMPLE_ACCOUNTS.home;
const loan = SAMPLE_ACCOUNTS.loan;

const percent = (value: unknown) =>
  value === undefined || value === null
    ? ""
    : `${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(Number(value))}%`;
const salary = Number(SAMPLE_SALARY ?? 0);

export const FIG = {
  savings: formatGbp(balanceOf(savings)),
  savingsRate: `${percent(savings?.interestRate)} AER`,
  salary: formatGbp(salary),
  grossMonthly: formatGbp(Math.round(salary / 12)),
  netMonthly: formatGbp(SAMPLE_BUDGET.comesIn),
  comesIn: formatGbp(SAMPLE_BUDGET.comesIn),
  goesOut: formatGbp(SAMPLE_BUDGET.goesOut),
  leftOver: formatGbp(SAMPLE_BUDGET.leftOver),
  mortgage: formatGbp(balanceOf(mortgage)),
  mortgageRate: percent(mortgage?.interestRate),
  fixedUntil: mortgage?.fixedRateEndDate ? formatMonthYear(mortgage.fixedRateEndDate) : "",
  pension: formatGbp(balanceOf(pension)),
  card: formatGbp(balanceOf(card)),
  cardRate: `${percent(card?.interestRate)} APR`,
  cardMonthly: formatGbp(Number(card?.monthlyContribution ?? 0)),
  home: formatGbp(balanceOf(home)),
  loan: formatGbp(balanceOf(loan)),
  netWorth: formatGbp(SAMPLE_DASHBOARD.netWorth),
  leftOverMonthly:
    SAMPLE_DASHBOARD.leftOverMonthly === null ? null : formatGbp(SAMPLE_DASHBOARD.leftOverMonthly),
  breathingRoom:
    SAMPLE_DASHBOARD.monthsOfCover === null
      ? null
      : breathingRoomValue(SAMPLE_DASHBOARD.monthsOfCover),
  /** A pension pot as a jar: filled to its share of what the household owns, for the drawing only. */
  pensionFill: Math.round((balanceOf(pension) / (balanceOf(pension) + balanceOf(savings))) * 70),
} as const;

export type PieceKey = "card" | "payslip" | "receipt" | "statement" | "pension" | "credit";

/** The order the pieces arrive in, and the "made from" rows in the finished dashboard. */
export const SOURCES: readonly {
  key: PieceKey;
  name: string;
  figure: string;
  detail: string;
}[] = [
  { key: "card", name: "Cash and savings", figure: FIG.savings, detail: FIG.savingsRate },
  { key: "pension", name: "Pension", figure: FIG.pension, detail: "Workplace and personal" },
  {
    key: "payslip",
    name: "Salary",
    figure: FIG.salary,
    detail: `${FIG.netMonthly} a month after tax`,
  },
  {
    key: "receipt",
    name: "Budget",
    figure: `${FIG.leftOver} left`,
    detail: `${FIG.comesIn} in, ${FIG.goesOut} out`,
  },
  {
    key: "statement",
    name: "Mortgage",
    figure: FIG.mortgage,
    detail: `${FIG.mortgageRate}, fixed until ${FIG.fixedUntil}`,
  },
  { key: "credit", name: "Credit card", figure: FIG.card, detail: FIG.cardRate },
];
