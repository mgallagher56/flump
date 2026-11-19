/**
 * The exact request bodies apps/web sends for onboarding, accounts and budget mutations
 * (E23 section 9.3). The backend contract test replays them against a real Postgres-backed app.
 *
 * Only the onboarding payloads are paired: apps/web/app/routes/app.onboarding.test.tsx holds the same
 * literals (duplicated by hand; the web tsconfig project cannot import backend files) and asserts
 * the web still sends exactly those shapes, so drift on either side fails a test. The accounts and budget payloads are copied from the web source by hand and are not
 * yet paired; they are to be replaced by shared zod schemas when E21 lands.
 *
 * Source of each shape:
 * - onboarding: apps/web/app/features/onboarding/useFinishOnboarding.ts + services/onboarding-seed.ts
 * - accounts: routes/app.accounts._index.tsx, app.savings.tsx, app.pension.tsx, app.debt.tsx,
 *   containers/mortgage/MortgageContainer.tsx
 * - budget: components/budget/BudgetCategoryTable.tsx + BudgetSetupWizard.tsx
 */

const ONBOARDING_PAGES = ["accounts", "budget", "savings", "debt", "pension", "mortgage"];

/** PATCH /user-profile sent first by onboarding handleFinish (after JSON serialisation). */
export const ONBOARDING_PROFILE = {
  birthYear: new Date().getFullYear() - 32,
  annualSalary: 45000,
  // Salary mode: the take-home is worked out from the salary, so none is typed (slice 6).
  monthlyTakeHome: null,
  employmentType: "employed",
  taxRegion: "SCOTLAND",
  studentLoanPlans: ["PLAN_2"],
  housingStatus: "mortgage",
  monthlyHousingCost: 900,
  monthlyOtherOutgoings: 700,
  hasMortgage: true,
  pensionPercent: 5,
  isSalarySacrifice: false,
  enabledPages: ONBOARDING_PAGES,
  dashboardWidgets: ONBOARDING_PAGES,
};

/** POST /accounts, one per seeded baseline account. */
export const ONBOARDING_ACCOUNTS = [
  { name: "Cash and emergency savings", type: "Saving", balance: 5000, isCurrent: true },
  { name: "Workplace and personal pension", type: "Pension", balance: 15000, isCurrent: true },
  // E16 D3: the owner's home estimate, so net worth and loan to value count it.
  {
    name: "Home (your estimate)",
    type: "Property",
    accountSubtype: "home",
    balance: 300000,
    isCurrent: true,
  },
  { name: "Residential Mortgage", type: "Mortgage", balance: 200000, isCurrent: true },
  { name: "Cards and loans baseline", type: "Credit Card", balance: 2000, isCurrent: true },
];

/** POST /budget-entries, one per seeded baseline entry. */
export const ONBOARDING_BUDGET_ENTRIES = [
  {
    name: "Monthly Take-Home Income",
    category: "income",
    amount: 2718,
    isIncome: true,
    frequency: "monthly",
  },
  // Linked to the saved housing payment, so it stores no amount (audit slice 5).
  {
    name: "Mortgage Payment",
    category: "housing",
    amount: 0,
    isIncome: false,
    isEssential: true,
    frequency: "monthly",
    linkKind: "housing",
  },
  {
    name: "General living and outgoings",
    category: "living",
    amount: 700,
    isIncome: false,
    frequency: "monthly",
  },
];

/** PATCH /user-profile sent last by onboarding. */
export const ONBOARDING_COMPLETE = { onboardingCompleted: true };

/** Account create/update bodies, keyed by the web page that sends them. */
export const ACCOUNT_CREATE_PAYLOADS = {
  accountsPage: { name: "Everyday Current", type: "Current", balance: 1250.5 },
  savingsPage: {
    name: "Easy Access Saver",
    type: "Saving",
    balance: 8000,
    interestRate: 4.25,
    monthlyContribution: 200,
  },
  pensionPage: {
    name: "Workplace Pension",
    type: "Pension",
    balance: 32000,
    interestRate: 5,
    monthlyContribution: 450,
    isCurrent: true,
  },
  debtPage: {
    name: "Store Card",
    type: "Credit Card",
    balance: -1800,
    interestRate: 22.9,
    monthlyContribution: 75,
  },
  /** E23 D19: the accounts dialog's Property type. */
  propertyAccount: { name: "Family Home", type: "Property", balance: 260000 },
  /** E23 D18: the accounts dialog's Student Loan type, with its repayment plan. */
  studentLoanAccount: {
    name: "Student Loan",
    type: "Student Loan",
    balance: 45000,
    studentLoanPlan: "PLAN_2",
  },
} as const;

export const ACCOUNT_UPDATE_PAYLOADS = {
  accountsPage: { name: "Everyday Current (joint)", type: "Current", balance: 1300.75 },
  savingsPage: {
    name: "Easy Access Saver Plus",
    type: "Saving",
    balance: 8500,
    interestRate: 4.5,
    monthlyContribution: 250,
  },
  pensionPage: {
    name: "Workplace Pension (closed)",
    balance: 33000,
    interestRate: 4.75,
    isCurrent: false,
    monthlyContribution: null,
  },
  debtPage: {
    name: "Store Card",
    type: "Credit Card",
    balance: -1500,
    interestRate: 21.5,
    monthlyContribution: 100,
  },
  propertyAccount: { name: "Family Home", type: "Property", balance: 270000 },
  studentLoanAccount: {
    name: "Student Loan",
    type: "Student Loan",
    balance: 44000,
    studentLoanPlan: "POSTGRAD",
  },
  /** MortgageContainer sends only the interest rate. */
  mortgagePage: { interestRate: 3.99 },
} as const;

/** POST /budget-entries as sent by BudgetCategoryTable (writable fields only, BE-10). */
export const BUDGET_CREATE_PAYLOAD = {
  category: "bills",
  name: "Broadband",
  amount: 35.99,
  frequency: "monthly",
  isIncome: false,
  isEssential: true,
  notes: "Fibre 900",
};

/** PATCH /budget-entries/:id as sent by BudgetCategoryTable's edit row. */
export const BUDGET_UPDATE_PAYLOAD = {
  name: "Broadband (new deal)",
  amount: 29.99,
  frequency: "annual",
  notes: null,
  isEssential: false,
};

/** POST /budget-entries/categories */
export const BUDGET_CATEGORY_PAYLOAD = { category: "Pets" };

/**
 * The mortgage and its home onboarding sends in one call (system audit slice 4), through its
 * route action to POST /accounts/mortgage-with-property. Duplicated in
 * apps/web/app/routes/app.onboarding.test.tsx.
 */
export const ONBOARDING_MORTGAGE_WITH_PROPERTY = {
  mortgage: {
    name: "Residential Mortgage",
    accountSubtype: "residential_mortgage",
    balance: 200000,
    isCurrent: true,
  },
  property: { name: "Home (your estimate)", balance: 300000 },
} as const;

/** Accounts created one by one, as the Accounts page sends them. */
export const CHECK_IN_ACCOUNTS = [
  { name: "Everyday Current", type: "Current", balance: 1000 },
  { name: "Easy Access Saver", type: "Saving", balance: 5000 },
  { name: "Store Card", type: "Credit Card", balance: -800 },
] as const;

/**
 * POST /accounts/mortgage-with-property: the Accounts mortgage dialog and onboarding send a
 * mortgage with the home's value (system audit slice 4).
 */
export const MORTGAGE_WITH_PROPERTY_PAYLOAD = {
  mortgage: {
    name: "Residential mortgage",
    accountSubtype: "residential_mortgage",
    balance: 186000,
    interestRate: 4.5,
    monthlyContribution: 1250,
    repaymentType: "repayment",
    ownership: "joint",
    sharePercent: 40,
  },
  property: { balance: 310000 },
} as const;
