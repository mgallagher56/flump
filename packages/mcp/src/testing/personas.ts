import type { BuildContextPackInput, FinancialBaseline } from "@flump/finance-engine";

const BASE: FinancialBaseline = {
  userId: "persona",
  taxYear: "2025/26",
  ukRegion: "ENGLAND_NI_WALES",
  employmentStatus: "PAYE",
  annualGrossSalary: 0,
  annualBonusOrSideIncome: 0,
  pensionContributionPct: 0,
  employerPensionMatchPct: 0,
  isSalarySacrifice: false,
  studentLoanPlan: "NONE",
  propertyOwnershipSharePct: 100,
  financialStage: "STAGE_2_BUFFER_BUILD",
  enabledModules: [],
};

/** A brand-new user: nothing entered, so every tool falls back to its own defaults. */
export const emptyUser: BuildContextPackInput = { baseline: { ...BASE } };

/** A renter with a salary and a credit card whose APR is unknown (no `interestRate`). */
export const renterWithUnknownAprCard: BuildContextPackInput = {
  baseline: {
    ...BASE,
    age: 29,
    annualGrossSalary: 38000,
    housingStatus: "RENTING",
    monthlyHousingCost: 950,
    monthlyOtherOutgoings: 800,
    totalCashSavings: 1200,
    pensionContributionPct: 4,
  },
  accounts: [
    { id: "cc_1", name: "Test Credit Card", type: "Credit Card", balance: 2400 },
    { id: "cur_1", name: "Test Current Account", type: "Current", balance: 1200 },
  ],
  budgetEntries: [],
};

/** A homeowner with a mortgage and an ISA. */
export const mortgageAndIsa: BuildContextPackInput = {
  baseline: {
    ...BASE,
    age: 41,
    annualGrossSalary: 72000,
    housingStatus: "MORTGAGE",
    monthlyHousingCost: 1400,
    monthlyOtherOutgoings: 1200,
    propertyValue: 410000,
    mortgageBalance: 255000,
    totalCashSavings: 18000,
    totalPensionPot: 90000,
    pensionContributionPct: 8,
    employerPensionMatchPct: 4,
    isSalarySacrifice: true,
  },
  accounts: [
    { id: "isa_1", name: "Test Stocks ISA", type: "ISA", balance: 32000 },
    { id: "cur_2", name: "Test Current Account", type: "Current", balance: 3100 },
  ],
  budgetEntries: [],
};

/** A saver with named institutions, history, a known-APR loan, an unknown-APR card and a budget (E17-N9). */
export const mixedAccountsWithHistory: BuildContextPackInput = {
  baseline: { ...BASE, age: 34, annualGrossSalary: 52000, housingStatus: "RENTING" },
  accounts: [
    {
      id: "11111111-aaaa-4aaa-8aaa-000000000001",
      name: "Monzo Current",
      type: "Current",
      balance: 2100,
    },
    {
      id: "11111111-aaaa-4aaa-8aaa-000000000002",
      name: "Barclays Saver",
      type: "Saving",
      balance: 8000,
      interestRate: 4.2,
    },
    {
      id: "11111111-aaaa-4aaa-8aaa-000000000003",
      name: "Amex Card",
      type: "Credit Card",
      balance: 3000,
    },
    {
      id: "11111111-aaaa-4aaa-8aaa-000000000004",
      name: "Santander Loan",
      type: "Loan",
      balance: 6000,
      interestRate: 7.9,
      monthlyContribution: 200,
    },
  ],
  accountDetails: [
    { accountId: "11111111-aaaa-4aaa-8aaa-000000000002", year: 2026, month: 8, value: 7000 },
    { accountId: "11111111-aaaa-4aaa-8aaa-000000000002", year: 2026, month: 9, value: 7500 },
    { accountId: "11111111-aaaa-4aaa-8aaa-000000000002", year: 2026, month: 10, value: 8000 },
    { accountId: "11111111-aaaa-4aaa-8aaa-000000000004", year: 2026, month: 8, value: 6600 },
    { accountId: "11111111-aaaa-4aaa-8aaa-000000000004", year: 2026, month: 10, value: 6000 },
  ],
  budgetEntries: [
    {
      id: "b1",
      category: "Salary",
      name: "Acme Ltd salary",
      amount: 3200,
      frequency: "monthly",
      isIncome: true,
      isEssential: false,
    },
    {
      id: "b2",
      category: "Housing",
      name: "Rent",
      amount: 1100,
      frequency: "monthly",
      isIncome: false,
      isEssential: true,
    },
    {
      id: "b3",
      category: "Insurance",
      name: "Barclays contents cover",
      amount: 240,
      frequency: "annual",
      isIncome: false,
      isEssential: true,
    },
    {
      id: "b4",
      category: "Fun",
      name: "Eating out",
      amount: 50,
      frequency: "weekly",
      isIncome: false,
      isEssential: false,
      notes: "secret note",
    },
  ],
};
