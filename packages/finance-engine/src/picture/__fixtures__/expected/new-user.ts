import type { PersonaExpected } from "../types.js";

export const newUserExpected: PersonaExpected = {
  // Salary is answered. Everything else is null, so take-home is unknown and names the gaps.
  takeHome: {
    status: "unknown",
    missing: ["employmentType", "pensionPercent", "isSalarySacrifice"], // in selector order
    reason: "not-set",
  },
  // No accounts: every total is a real zero over no rows, not an invented default.
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
};
