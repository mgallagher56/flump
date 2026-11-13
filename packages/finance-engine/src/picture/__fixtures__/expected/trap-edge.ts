import type { PersonaExpected, TaxTrapExpectation } from "../types.js";

/** The take-home expectation is unknown-amount only: no pension, no loan, England. */
export const trapEdgeExpected: PersonaExpected = {
  takeHome: {
    status: "known",
    provenance: "derived",
    assumptions: [],
    region: "ENGLAND_NI_WALES",
    hasStudentLoanDeduction: false,
    pensionDeduction: 0, // pensionPercent is 0
  },
  portfolio: {
    netWorth: 0,
    totalAssets: 0,
    totalLiabilities: 0,
    consumerDebt: 0,
    liquidCash: 0,
    investments: 0,
    pensions: 0,
    property: 0,
    studentLoans: 0,
    mortgageBalance: 0,
    debtItemIds: [],
  },
  budget: { income: 0, essentials: 0, savings: 0, discretionary: 0, surplus: 0 },
  cover: { monthsOfCover: null, essentialCommitments: null, safeToSpendMonthly: null }, // no budget
};

/** Keyed by salary. Rates are statutory (40/45 bands, 1.5x taper factor, 2% NI above 50,270). */
export const trapEdgeTrapExpected: Record<
  "at100k" | "at112570" | "at125140" | "at125141",
  TaxTrapExpectation
> = {
  at100k: {
    isInTaxTrap: false, // the trap is strictly above 100,000
    isNearTaxTrap: true, // 90,000 to 100,000 inclusive
    adjustedNetIncome: 100000, // no pension
    excessOver100k: 0,
    personalAllowanceTaper: 0, // full allowance retained at exactly 100,000
    marginalRatePct: 40, // taxable 87,430 is in the higher band, no taper factor yet
    effectiveMarginalRatePct: 42, // 40 + 2% NI
    contributionRequiredToEscape: 0,
  },
  at112570: {
    isInTaxTrap: true,
    isNearTaxTrap: false,
    adjustedNetIncome: 112570,
    excessOver100k: 12570, // 112,570 - 100,000
    personalAllowanceTaper: 6285, // floor(12,570 / 2): half the allowance gone
    marginalRatePct: 60, // 40 x 1.5
    effectiveMarginalRatePct: 62, // + 2% NI
    contributionRequiredToEscape: 12570,
  },
  at125140: {
    isInTaxTrap: true, // the upper bound is inclusive
    isNearTaxTrap: false,
    adjustedNetIncome: 125140,
    excessOver100k: 25140, // 125,140 - 100,000
    personalAllowanceTaper: 12570, // allowance fully withdrawn
    marginalRatePct: 60, // taxable 125,140 is the last higher-rate pound (additional is above 125,140)
    effectiveMarginalRatePct: 62,
    contributionRequiredToEscape: 25140,
  },
  at125141: {
    isInTaxTrap: false, // one pound above the trap
    isNearTaxTrap: false,
    adjustedNetIncome: 125141,
    excessOver100k: 25141,
    personalAllowanceTaper: 12570, // taper is capped at the allowance
    marginalRatePct: 45, // additional rate, no taper factor
    effectiveMarginalRatePct: 47, // + 2% NI
    contributionRequiredToEscape: 25141, // cements current engine behaviour (excess over 100k, though already outside the trap)
  },
};
