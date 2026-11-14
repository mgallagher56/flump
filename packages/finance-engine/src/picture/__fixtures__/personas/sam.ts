import { DEFAULT_NET_WORTH_BASIS } from "../../../net-worth-basis.js";
import { budgetEntry } from "../builders.js";
import type { PersonaFixture } from "../types.js";

/** P1 Sam: 29, GBP 38,000 PAYE, Plan 2 student loan, renting in England. */
export const sam: PersonaFixture = {
  netWorthBasis: DEFAULT_NET_WORTH_BASIS,
  profile: {
    annualSalary: 38000,
    employmentType: "employed",
    taxRegion: "ENGLAND",
    studentLoanPlans: ["PLAN_2"],
    pensionPercent: 5,
    isSalarySacrifice: false,
  },
  accounts: [
    { id: "sam-current", name: "Monzo current", type: "Current", balance: 1850 },
    { id: "sam-cash-isa", name: "Cash ISA", type: "Saving", balance: 4200, interestRate: 4.1 },
    { id: "sam-student-loan", name: "Student loan", type: "Student Loan", balance: 41500 },
  ],
  details: [],
  budget: [
    budgetEntry("sam-b1", "income", "Salary (net)", 2382, { isIncome: true }),
    budgetEntry("sam-b2", "housing", "Rent", 850, { isEssential: true }),
    budgetEntry("sam-b3", "bills", "Energy, water, broadband", 120, { isEssential: true }),
    budgetEntry("sam-b4", "food", "Groceries", 220, { isEssential: true }),
    budgetEntry("sam-b5", "transport", "Travel", 90, { isEssential: true }),
    budgetEntry("sam-b6", "savings", "ISA saving", 150),
    budgetEntry("sam-b7", "leisure", "Going out", 200),
  ],
  taxRecords: [],
};
