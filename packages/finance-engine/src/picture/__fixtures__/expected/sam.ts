import type { PersonaExpected } from "../types.js";

export const samExpected: PersonaExpected = {
  takeHome: {
    status: "known", // salary, employment, pension %, salary sacrifice all answered
    provenance: "derived", // region and loan both answered, so nothing assumed
    assumptions: [],
    region: "ENGLAND_NI_WALES", // England maps to the England, Wales and NI rate table
    hasStudentLoanDeduction: true, // Plan 2 threshold is below 38,000 so a deduction applies
    pensionDeduction: 1900, // 38,000 x 5%
  },
  portfolio: {
    netWorth: 6050, // 1,850 + 4,200; student loan excluded (D-5-B)
    totalAssets: 6050, // 1,850 + 4,200
    totalLiabilities: 0, // student loan is neither asset nor liability
    consumerDebt: 0, // no cards, loans or overdraft
    liquidCash: 6050, // current 1,850 + saving 4,200
    investments: 0,
    pensions: 0,
    property: 0, // renting
    studentLoans: 41500, // reported separately
    mortgageBalance: 0,
    debtItemIds: [], // student loan is not in the payoff set
  },
  budget: {
    income: 2382, // net salary = engine take-home monthly for 38,000 Plan 2, 2026/27
    essentials: 1280, // 850 + 120 + 220 + 90
    savings: 150,
    discretionary: 200,
    surplus: 752, // 2,382 - (1,280 + 150 + 200)
  },
  cover: {
    monthsOfCover: 4.7, // 6,050 / 1,280 essentials
    essentialCommitments: 1280,
    safeToSpendMonthly: 952, // 2,382 take-home - 1,280 - 150 savings
  },
};
