import { DEFAULT_NET_WORTH_BASIS } from "../../../net-worth-basis.js";
import { budgetEntry } from "../builders.js";
import type { PersonaFixture } from "../types.js";

/**
 * E16 PR 3 homeowner, saved as onboarding saves it: GBP 52,000 PAYE, 5% pension, a home the
 * user estimates at GBP 310,000 (seeded as the "Home (your estimate)" Property account), a
 * GBP 186,000 repayment mortgage, GBP 21,000 cash and a GBP 96,000 pension pot. The home counts
 * in net worth once, labelled (D3), and loan to value is 186,000 / 310,000 = 60%.
 *
 * E42 S8 adds what the savings and debt sample previews read: a 3.5% AER on the cash savings, a
 * 4.19% rate and a fixed rate that ends on 30 September 2028 on the mortgage, and a credit card
 * (GBP 1,800 at 22.9% APR, GBP 60 a month) and a personal loan (GBP 7,200 at 6.9% APR, GBP 220 a
 * month). Their payments (60 + 220 = 280) are an essential budget row. Test data only.
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
  },
  accounts: [
    {
      id: "homeowner-cash",
      name: "Cash and emergency savings",
      type: "Saving",
      balance: 21000,
      interestRate: 3.5,
    },
    {
      id: "homeowner-pension",
      name: "Workplace and personal pension",
      type: "Pension",
      balance: 96000,
    },
    { id: "homeowner-home", name: "Home (your estimate)", type: "Property", balance: 310000 },
    {
      id: "homeowner-mortgage",
      name: "Residential Mortgage",
      type: "Mortgage",
      balance: 186000,
      interestRate: 4.19,
      fixedRateEndDate: "2028-09-30",
    },
    {
      id: "homeowner-card",
      name: "Credit card",
      type: "Credit Card",
      balance: 1800,
      interestRate: 22.9,
      monthlyContribution: 60,
    },
    {
      id: "homeowner-loan",
      name: "Personal loan",
      type: "Loan",
      balance: 7200,
      interestRate: 6.9,
      monthlyContribution: 220,
    },
  ],
  details: [],
  budget: [
    budgetEntry("homeowner-b1", "income", "Salary (net)", 3249, { isIncome: true }),
    budgetEntry("homeowner-b2", "housing", "Mortgage payment", 1050, { isEssential: true }),
    budgetEntry("homeowner-b3", "bills", "Council tax and energy", 330, { isEssential: true }),
    budgetEntry("homeowner-b4", "food", "Groceries", 400, { isEssential: true }),
    budgetEntry("homeowner-b5", "savings", "Cash saving", 300),
    budgetEntry("homeowner-b6", "leisure", "Going out", 250),
    // The card and loan minimums (60 + 220), as debt-stressed and heavy model debt payments.
    budgetEntry("homeowner-b7", "debt", "Card and loan payments", 280, { isEssential: true }),
  ],
  taxRecords: [],
};
