import { budgetEntry, taxRecord } from "../builders.js";
import type { PersonaFixture } from "../types.js";

/**
 * P4 Dan: GBP 46,000 PAYE plus one buy-to-let (GBP 235,000, GBP 150,000 interest-only mortgage,
 * GBP 1,100 a month rent). Self assessment records over 2025/26 and 2026/27. The annual records
 * (insurance, mortgage interest) are once-a-year figures filed in the year of their date.
 */
export const dan: PersonaFixture = {
  profile: {
    annualSalary: 46000,
    employmentType: "employed",
    taxRegion: "ENGLAND",
    studentLoanPlans: [],
    pensionPercent: 5,
    isSalarySacrifice: false,
  },
  accounts: [
    { id: "dan-current", name: "Current account", type: "Current", balance: 2400 },
    { id: "dan-saver", name: "Tax pot", type: "Saving", balance: 9000, interestRate: 4.2 },
    { id: "dan-btl", name: "Buy-to-let flat", type: "Property", balance: 235000 },
    {
      id: "dan-btl-mortgage",
      name: "BTL interest-only mortgage",
      type: "Mortgage",
      balance: 150000,
      interestRate: 4.5,
      monthlyContribution: 562.5,
    },
  ],
  details: [],
  budget: [
    budgetEntry("dan-b1", "income", "Salary (net)", 2900, { isIncome: true }),
    budgetEntry("dan-b2", "income", "Rent received", 1100, { isIncome: true }),
    budgetEntry("dan-b3", "housing", "Own rent", 900, { isEssential: true }),
    budgetEntry("dan-b4", "housing", "BTL mortgage interest", 562.5, { isEssential: true }),
    budgetEntry("dan-b5", "bills", "Household bills", 260, { isEssential: true }),
    budgetEntry("dan-b6", "food", "Groceries", 300, { isEssential: true }),
    budgetEntry("dan-b7", "transport", "Car", 180, { isEssential: true }),
    budgetEntry("dan-b8", "savings", "Tax pot", 250),
    budgetEntry("dan-b9", "leisure", "Leisure", 350),
  ],
  taxRecords: [
    // Monthly rent from April 2025 with no end date: 12 months in each of the two years.
    taxRecord({
      id: "dan-t1",
      type: "income",
      source: "rental",
      category: "rental_income",
      name: "Rent",
      amount: 1100,
      date: "2025-04-01",
    }),
    // Agent fees, 10% of rent, monthly.
    taxRecord({
      id: "dan-t2",
      type: "expense",
      source: "rental",
      category: "legal_management_fees",
      name: "Letting agent",
      amount: 110,
      date: "2025-04-01",
    }),
    // Annual records, one per tax year, each counted once in its own year.
    taxRecord({
      id: "dan-t3",
      type: "expense",
      source: "rental",
      category: "rent_rates_insurance",
      name: "Landlord insurance 2025/26",
      amount: 420,
      frequency: "annual",
      date: "2025-06-15",
    }),
    taxRecord({
      id: "dan-t4",
      type: "expense",
      source: "rental",
      category: "rent_rates_insurance",
      name: "Landlord insurance 2026/27",
      amount: 430,
      frequency: "annual",
      date: "2026-06-15",
    }),
    taxRecord({
      id: "dan-t5",
      type: "expense",
      source: "rental",
      category: "mortgage_interest",
      name: "Mortgage interest 2025/26",
      amount: 6750,
      frequency: "annual",
      date: "2025-05-01",
    }),
    taxRecord({
      id: "dan-t6",
      type: "expense",
      source: "rental",
      category: "mortgage_interest",
      name: "Mortgage interest 2026/27",
      amount: 7000,
      frequency: "annual",
      date: "2026-05-01",
    }),
    // One-off repairs.
    taxRecord({
      id: "dan-t7",
      type: "expense",
      source: "rental",
      category: "repairs_maintenance",
      name: "Boiler repair",
      amount: 850,
      frequency: "one-off",
      date: "2025-11-20",
    }),
    taxRecord({
      id: "dan-t8",
      type: "expense",
      source: "rental",
      category: "repairs_maintenance",
      name: "Redecorating",
      amount: 640,
      frequency: "one-off",
      date: "2026-08-10",
    }),
  ],
};
