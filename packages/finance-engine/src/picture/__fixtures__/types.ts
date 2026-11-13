import type { BudgetEntryItem } from "../../ai-context-pack.js";
import type { RawAccount, RawAccountDetail } from "../../portfolio.js";
import type { TaxRecord } from "../../tax-calculator.js";
import type { UkTaxRegion } from "../../types.js";
import type { FigureProvenance } from "../figure.js";
import type { FactKey, ProfileFacts } from "../input.js";

/** The rows one persona feeds into the financial picture (E23 section 9.1). Data only. */
export interface PersonaFixture {
  profile: ProfileFacts;
  accounts: RawAccount[];
  details: RawAccountDetail[];
  budget: BudgetEntryItem[];
  taxRecords: TaxRecord[];
}

/**
 * Tax amounts are never stored here: no tax vector is owner-signed yet (E23 section 10), so
 * tax expectations are status, provenance, region, record sums (plain addition) and
 * relationships between figures.
 */
export type TakeHomeExpectation =
  | {
      status: "known";
      provenance: FigureProvenance;
      assumptions: string[];
      region: UkTaxRegion;
      /** True when a student loan deduction must be above zero. */
      hasStudentLoanDeduction: boolean;
      /** Employee pension deduction in pounds (plain salary x percent arithmetic). */
      pensionDeduction: number;
    }
  | { status: "unknown"; missing: FactKey[]; reason: "not-set" };

export interface PortfolioExpectation {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  consumerDebt: number;
  liquidCash: number;
  investments: number;
  pensions: number;
  property: number;
  studentLoans: number;
  mortgageBalance: number;
  debtItemIds: string[];
}

export interface BudgetExpectation {
  income: number;
  essentials: number;
  savings: number;
  discretionary: number;
  surplus: number;
}

export interface TaxTrapExpectation {
  isInTaxTrap: boolean;
  isNearTaxTrap: boolean;
  adjustedNetIncome: number;
  excessOver100k: number;
  personalAllowanceTaper: number;
  /** Income tax only (D7-a named field). */
  marginalRatePct: number;
  /** Income tax plus employee NI (D7-a named field). */
  effectiveMarginalRatePct: number;
  contributionRequiredToEscape: number;
}

export interface TaxYearRecordExpectation {
  rentalIncomeGross: number;
  rentalExpensesExclInterest: number;
  rentalMortgageInterest: number;
  rentalProfitBeforeInterest: number;
  seIncomeGross: number;
  seExpenses: number;
  seProfit: number;
  savingsInterestGross: number;
  dividendIncomeGross: number;
}

export interface MonthlyHistoryExpectation {
  year: number;
  month: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}

export interface PersonaExpected {
  takeHome: TakeHomeExpectation;
  portfolio: PortfolioExpectation;
  budget: BudgetExpectation;
}
