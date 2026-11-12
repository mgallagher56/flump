import type { Persona } from "../types.js";

export const landlordSection24: Persona = {
  id: "landlord-section-24",
  label: "Landlord with Section 24 records",
  profile: { annualSalaryGbp: 54000, region: "england" },
  accounts: [
    { id: "acc_1", name: "Current account", category: "cash", balanceGbp: 6400 },
    { id: "acc_2", name: "Rental property", category: "property", balanceGbp: 240000 },
    {
      id: "acc_3",
      name: "Buy-to-let mortgage",
      category: "mortgage",
      balanceGbp: 150000,
      aprPct: 5.1,
      remainingTermMonths: 180,
    },
    {
      id: "acc_4",
      name: "Workplace pension",
      category: "pension",
      balanceGbp: 52000,
      monthlyContributionGbp: 300,
    },
  ],
  budget: { monthlyIncomeGbp: 3500, monthlyEssentialsGbp: 2300, monthlyDiscretionaryGbp: 600 },
};
