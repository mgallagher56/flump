import { budgetEntry } from "../builders.js";
import type { PersonaFixture } from "../types.js";

/**
 * P3 Gareth: 52, GBP 72,000, workplace pension 10% (GBP 600 a month) plus a SIPP and an ISA,
 * home mortgage nearly paid off (36 months left). Contributions are stored per pot (D21).
 */
export const gareth: PersonaFixture = {
  profile: {
    annualSalary: 72000,
    employmentType: "employed",
    taxRegion: "ENGLAND",
    studentLoanPlans: [],
    pensionPercent: 10,
    isSalarySacrifice: false,
  },
  accounts: [
    { id: "gareth-current", name: "Current account", type: "Current", balance: 3100 },
    {
      id: "gareth-saver",
      name: "Emergency fund",
      type: "Saving",
      balance: 15000,
      interestRate: 4.2,
    },
    {
      id: "gareth-isa",
      name: "Stocks and shares ISA",
      type: "Investment",
      balance: 88000,
      monthlyContribution: 500,
    },
    {
      id: "gareth-workplace",
      name: "Workplace pension",
      type: "Pension",
      balance: 142000,
      monthlyContribution: 600,
    },
    {
      id: "gareth-sipp",
      name: "SIPP",
      type: "Pension",
      balance: 205000,
      monthlyContribution: 800,
    },
    { id: "gareth-home", name: "Home", type: "Property", balance: 410000 },
    {
      id: "gareth-mortgage",
      name: "Mortgage",
      type: "Mortgage",
      balance: 38500,
      interestRate: 3.1,
      termMonths: 36,
      monthlyContribution: 1150,
    },
  ],
  details: [],
  budget: [
    budgetEntry("gareth-b1", "income", "Salary (net)", 4000, { isIncome: true }),
    budgetEntry("gareth-b2", "housing", "Mortgage", 1150, { isEssential: true }),
    budgetEntry("gareth-b3", "bills", "Household bills", 420, { isEssential: true }),
    budgetEntry("gareth-b4", "food", "Groceries", 480, { isEssential: true }),
    budgetEntry("gareth-b5", "transport", "Car and fuel", 250, { isEssential: true }),
    budgetEntry("gareth-b6", "savings", "ISA", 500),
    budgetEntry("gareth-b7", "savings", "SIPP", 800),
    budgetEntry("gareth-b8", "leisure", "Holidays", 100),
    budgetEntry("gareth-b9", "leisure", "Hobbies", 200),
  ],
  taxRecords: [],
};
