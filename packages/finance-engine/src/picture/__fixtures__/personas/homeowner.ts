import { DEFAULT_NET_WORTH_BASIS } from "../../../net-worth-basis.js";
import { budgetEntry } from "../builders.js";
import type { PersonaFixture } from "../types.js";

/**
 * E16 PR 3 homeowner, saved as onboarding saves it: GBP 52,000 PAYE, 5% pension, a home the
 * user estimates at GBP 310,000 (seeded as the "Home (your estimate)" Property account), a
 * GBP 186,000 repayment mortgage, GBP 21,000 cash and a GBP 96,000 pension pot. The home counts
 * in net worth once, labelled (D3), and loan to value is 186,000 / 310,000 = 60%.
 */
export const homeowner: PersonaFixture = {
  netWorthBasis: DEFAULT_NET_WORTH_BASIS,
  profile: {
    annualSalary: 52000,
    employmentType: "employed",
    taxRegion: "ENGLAND",
    studentLoanPlans: [],
    pensionPercent: 5,
    isSalarySacrifice: false,
    housingStatus: "mortgage",
    monthlyHousingCost: 1050,
    mortgageType: "repayment",
  },
  accounts: [
    { id: "homeowner-cash", name: "Cash and emergency savings", type: "Saving", balance: 21000 },
    {
      id: "homeowner-pension",
      name: "Workplace and personal pension",
      type: "Pension",
      balance: 96000,
    },
    { id: "homeowner-home", name: "Home (your estimate)", type: "Property", balance: 310000 },
    { id: "homeowner-mortgage", name: "Residential Mortgage", type: "Mortgage", balance: 186000 },
  ],
  details: [],
  budget: [
    budgetEntry("homeowner-b1", "income", "Salary (net)", 3249, { isIncome: true }),
    budgetEntry("homeowner-b2", "housing", "Mortgage payment", 1050, { isEssential: true }),
    budgetEntry("homeowner-b3", "bills", "Council tax and energy", 330, { isEssential: true }),
    budgetEntry("homeowner-b4", "food", "Groceries", 400, { isEssential: true }),
    budgetEntry("homeowner-b5", "savings", "Cash saving", 300),
    budgetEntry("homeowner-b6", "leisure", "Going out", 250),
  ],
  taxRecords: [],
};
