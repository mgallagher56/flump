import type { Persona } from "../types.js";

export const mortgageIsa: Persona = {
  id: "mortgage-isa",
  label: "Mortgage plus ISA",
  profile: { annualSalaryGbp: 62000, region: "england" },
  accounts: [
    { id: "acc_1", name: "Current account", category: "cash", balanceGbp: 4100 },
    {
      id: "acc_2",
      name: "Stocks and shares ISA",
      category: "investment",
      balanceGbp: 18000,
      monthlyContributionGbp: 300,
    },
    {
      id: "acc_3",
      name: "Workplace pension",
      category: "pension",
      balanceGbp: 41000,
      monthlyContributionGbp: 420,
    },
    { id: "acc_4", name: "Home", category: "property", balanceGbp: 320000 },
    {
      id: "acc_5",
      name: "Mortgage",
      category: "mortgage",
      balanceGbp: 210000,
      aprPct: 4.2,
      remainingTermMonths: 240,
    },
  ],
  budget: { monthlyIncomeGbp: 3900, monthlyEssentialsGbp: 2600, monthlyDiscretionaryGbp: 700 },
};
