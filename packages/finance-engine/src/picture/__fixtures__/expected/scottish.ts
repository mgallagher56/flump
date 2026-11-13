import type { PersonaExpected } from "../types.js";

export const scottishExpected: PersonaExpected = {
  takeHome: {
    status: "known",
    provenance: "derived",
    assumptions: [],
    region: "SCOTLAND", // answered SCOTLAND, so Scottish bands (not the England assumption)
    hasStudentLoanDeduction: false,
    pensionDeduction: 0, // pensionPercent is 0
  },
  portfolio: {
    netWorth: 8750, // 2,750 + 6,000
    totalAssets: 8750,
    totalLiabilities: 0,
    consumerDebt: 0,
    liquidCash: 8750,
    investments: 0,
    pensions: 0,
    property: 0,
    studentLoans: 0,
    mortgageBalance: 0,
    debtItemIds: [],
  },
  budget: { income: 0, essentials: 0, savings: 0, discretionary: 0, surplus: 0 },
};
