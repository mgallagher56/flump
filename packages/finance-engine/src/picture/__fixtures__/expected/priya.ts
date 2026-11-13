import type { PersonaExpected, TaxTrapExpectation } from "../types.js";

export const priyaExpected: PersonaExpected = {
  takeHome: {
    status: "known",
    provenance: "derived",
    assumptions: [],
    region: "ENGLAND_NI_WALES",
    hasStudentLoanDeduction: false, // studentLoanPlans is [] (answered: none)
    pensionDeduction: 8960, // 112,000 x 8% sacrificed
  },
  portfolio: {
    netWorth: 337900, // 622,900 assets - 285,000 mortgage
    totalAssets: 622900, // 6,400 + 22,000 + 48,000 + 96,500 + 450,000
    totalLiabilities: 285000, // mortgage only
    consumerDebt: 0,
    liquidCash: 28400, // 6,400 + 22,000
    investments: 48000,
    pensions: 96500,
    property: 450000,
    studentLoans: 0,
    mortgageBalance: 285000,
    debtItemIds: [], // a mortgage is not in the consumer payoff set
  },
  budget: {
    income: 5809, // net salary = engine take-home monthly (8% sacrifice, 2026/27)
    essentials: 3350, // 1,420 + 900 + 380 + 650
    savings: 800,
    discretionary: 550, // 300 + 250
    surplus: 1109, // 5,809 - (3,350 + 800 + 550)
  },
  cover: {
    monthsOfCover: 8.5, // 28,400 / 3,350
    essentialCommitments: 3350,
    safeToSpendMonthly: 1659, // 5,809 - 3,350 - 800
  },
};

/** 8% sacrifice leaves adjusted net income 112,000 x 0.92 = 103,040, inside the trap. */
export const priyaTrapExpected: TaxTrapExpectation = {
  isInTaxTrap: true, // above 100,000 and below 125,140
  isNearTaxTrap: false, // near means 90,000 to 100,000
  adjustedNetIncome: 103040, // 112,000 - 8,960
  excessOver100k: 3040, // 103,040 - 100,000
  personalAllowanceTaper: 1520, // floor(3,040 / 2): GBP 1 lost per GBP 2 over 100,000
  marginalRatePct: 60, // 40% band rate x 1.5 inside the taper (D7-a, income tax only)
  effectiveMarginalRatePct: 62, // 60 + 2% employee NI above the upper earnings limit (D7-a)
  contributionRequiredToEscape: 3040, // extra sacrifice to reach exactly 100,000
};
