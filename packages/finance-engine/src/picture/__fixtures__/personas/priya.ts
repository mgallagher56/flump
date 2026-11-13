import { budgetEntry } from "../builders.js";
import type { PersonaFixture } from "../types.js";

/** P2 Priya: GBP 112,000, 8% salary sacrifice, repayment mortgage, two children. */
export const priya: PersonaFixture = {
  profile: {
    annualSalary: 112000,
    employmentType: "employed",
    taxRegion: "ENGLAND",
    studentLoanPlans: [],
    pensionPercent: 8,
    isSalarySacrifice: true,
  },
  accounts: [
    { id: "priya-current", name: "Joint current", type: "Current", balance: 6400 },
    {
      id: "priya-saver",
      name: "Easy access saver",
      type: "Saving",
      balance: 22000,
      interestRate: 4.3,
    },
    { id: "priya-isa", name: "Stocks and shares ISA", type: "Investment", balance: 48000 },
    { id: "priya-pension", name: "Workplace pension", type: "Pension", balance: 96500 },
    { id: "priya-home", name: "Family home", type: "Property", balance: 450000 },
    {
      id: "priya-mortgage",
      name: "Repayment mortgage",
      type: "Mortgage",
      balance: 285000,
      interestRate: 4.6,
      termMonths: 252,
      monthlyContribution: 1420,
    },
  ],
  details: [],
  budget: [
    budgetEntry("priya-b1", "income", "Salary (net)", 5809, { isIncome: true }),
    budgetEntry("priya-b2", "housing", "Mortgage", 1420, { isEssential: true }),
    budgetEntry("priya-b3", "childcare", "Childcare", 900, { isEssential: true }),
    budgetEntry("priya-b4", "bills", "Household bills", 380, { isEssential: true }),
    budgetEntry("priya-b5", "food", "Groceries", 650, { isEssential: true }),
    budgetEntry("priya-b6", "savings", "ISA saving", 800),
    budgetEntry("priya-b7", "leisure", "Holidays", 300),
    budgetEntry("priya-b8", "leisure", "Eating out", 250),
  ],
  taxRecords: [],
};
