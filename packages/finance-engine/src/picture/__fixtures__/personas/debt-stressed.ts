import { DEFAULT_NET_WORTH_BASIS } from "../../../net-worth-basis.js";
import { budgetEntry } from "../builders.js";
import type { PersonaFixture } from "../types.js";

/**
 * P6 debt-stressed: GBP 27,500, two credit cards and a loan, and a current account overdrawn by
 * GBP 640. Card B has no stored rate and no stored minimum payment: nothing is invented for it.
 */
export const debtStressed: PersonaFixture = {
  netWorthBasis: DEFAULT_NET_WORTH_BASIS,
  profile: {
    annualSalary: 27500,
    employmentType: "employed",
    taxRegion: "ENGLAND",
    studentLoanPlans: [],
    pensionPercent: 3,
    isSalarySacrifice: false,
  },
  accounts: [
    { id: "debt-current", name: "Current account", type: "Current", balance: -640 },
    { id: "debt-saver", name: "Rainy day", type: "Saving", balance: 120, interestRate: 3.5 },
    {
      id: "debt-card-a",
      name: "Card A",
      type: "Credit Card",
      balance: 4850,
      interestRate: 24.9,
      monthlyContribution: 130,
    },
    { id: "debt-card-b", name: "Card B", type: "Credit Card", balance: 3120, interestRate: null },
    {
      id: "debt-loan",
      name: "Personal loan",
      type: "Loan",
      balance: 6400,
      interestRate: 11.9,
      monthlyContribution: 210,
    },
  ],
  details: [],
  budget: [
    budgetEntry("debt-b1", "income", "Salary (net)", 1888, { isIncome: true }),
    budgetEntry("debt-b2", "housing", "Rent", 800, { isEssential: true }),
    budgetEntry("debt-b3", "bills", "Household bills", 240, { isEssential: true }),
    budgetEntry("debt-b4", "food", "Groceries", 300, { isEssential: true }),
    budgetEntry("debt-b5", "transport", "Travel", 120, { isEssential: true }),
    budgetEntry("debt-b6", "debt", "Card and loan payments", 418, { isEssential: true }),
    budgetEntry("debt-b7", "leisure", "Leisure", 90),
  ],
  taxRecords: [],
};
