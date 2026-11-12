import type { Persona } from "../types.js";

/** GBP 98,000 salary plus a GBP 7,000 bonus: adjusted net income of GBP 105,000 (the 100k trap). */
export const highEarnerBonus: Persona = {
  id: "high-earner-bonus",
  label: "GBP 105k earner with bonus (the 100k trap)",
  profile: { annualSalaryGbp: 98000, bonusGbp: 7000, region: "england" },
  accounts: [
    { id: "acc_1", name: "Current account", category: "cash", balanceGbp: 12000 },
    { id: "acc_2", name: "Cash ISA", category: "cash", balanceGbp: 20000, aprPct: 4.3 },
    {
      id: "acc_3",
      name: "Workplace pension",
      category: "pension",
      balanceGbp: 96000,
      monthlyContributionGbp: 490,
    },
  ],
  budget: { monthlyIncomeGbp: 6100, monthlyEssentialsGbp: 3200, monthlyDiscretionaryGbp: 1500 },
};
