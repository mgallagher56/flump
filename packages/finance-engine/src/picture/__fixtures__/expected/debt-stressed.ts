import type { PersonaExpected } from "../types.js";

export const debtStressedExpected: PersonaExpected = {
  takeHome: {
    status: "known",
    provenance: "derived",
    assumptions: [],
    region: "ENGLAND_NI_WALES",
    hasStudentLoanDeduction: false,
    pensionDeduction: 825, // 27,500 x 3%
  },
  portfolio: {
    netWorth: -14890, // 120 saver - 640 overdrawn - 14,370 debts
    totalAssets: 120, // only positive asset balances: the saver
    totalLiabilities: 15010, // 14,370 debts + 640 overdrawn (C-15)
    consumerDebt: 15010, // 4,850 + 3,120 + 6,400 + 640 overdrawn
    liquidCash: 120, // the overdrawn account is not netted against savings
    investments: 0,
    pensions: 0,
    property: 0,
    studentLoans: 0,
    mortgageBalance: 0,
    // The overdrawn current account is never a payoff item (its id would delete the account).
    debtItemIds: ["debt-card-a", "debt-card-b", "debt-loan"],
  },
  budget: {
    income: 1888, // net salary = engine take-home monthly for 27,500, 3% pension
    essentials: 1878, // 800 + 240 + 300 + 120 + 418
    savings: 0,
    discretionary: 90,
    surplus: -80, // 1,888 - (1,878 + 0 + 90): spending exceeds income
  },
  cover: {
    monthsOfCover: 0.1, // 120 / (1,460 + max(418 minimums, 418 budgeted))
    essentialCommitments: 1878,
    safeToSpendMonthly: 10, // 1,888 - 1,878 - 0
  },
};

/** Card B has no stored APR or payment: the engine reports it unknown instead of inventing it. */
export const debtStressedItemsExpected = {
  "debt-card-a": {
    balance: 4850,
    apr: 24.9,
    aprKnown: true,
    minimumPayment: 130,
    estimated: false,
  },
  // No stored rate. Estimated minimum is the greater of 25 and 2.5% of 3,120 = 78.
  "debt-card-b": { balance: 3120, apr: 0, aprKnown: false, minimumPayment: 78, estimated: true },
  "debt-loan": { balance: 6400, apr: 11.9, aprKnown: true, minimumPayment: 210, estimated: false },
} as const;
