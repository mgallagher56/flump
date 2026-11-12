import type { Persona } from "../types.js";

/** Renter with a credit card whose APR is unknown: the agent must ask, never invent. */
export const renterCreditCard: Persona = {
  id: "renter-credit-card",
  label: "Renter with a credit card of unknown APR",
  profile: {
    annualSalaryGbp: 36000,
    region: "england",
    studentLoanPlan: "plan2",
    studentLoanBalanceGbp: 31000,
  },
  accounts: [
    { id: "acc_1", name: "Current account", category: "cash", balanceGbp: 1850 },
    { id: "acc_2", name: "Easy access saver", category: "cash", balanceGbp: 3200, aprPct: 4.1 },
    { id: "acc_3", name: "Credit card", category: "consumer_debt", balanceGbp: 2400, aprPct: null },
    {
      id: "acc_4",
      name: "Workplace pension",
      category: "pension",
      balanceGbp: 8700,
      monthlyContributionGbp: 150,
    },
  ],
  budget: { monthlyIncomeGbp: 2350, monthlyEssentialsGbp: 1650, monthlyDiscretionaryGbp: 420 },
};
