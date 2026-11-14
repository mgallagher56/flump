// Deterministic, made-up personas for the staging database (E18-N11). Nothing here is real:
// names carry the "Synthetic" marker, amounts are round and invented, and no bank tokens, MCP
// tokens, receipts or e-mail addresses are included. Shapes follow the web payloads in
// apps/backend/test/contract/web-payloads.ts; personas follow docs/audit/plans/E16-plan-draft.md
// (P1 Sam, P2 Priya, P3 Gareth, P5 Alex). Column names are the CURRENT entity columns
// (apps/backend/src/entities); seed-synthetic.test.ts runs the seed after ALL migrations so any
// drift fails CI.

export const PERSONA_KEYS = ["P1", "P2", "P3", "P5"] as const;
export type PersonaKey = (typeof PERSONA_KEYS)[number];

export interface SyntheticAccount {
  name: string;
  type: "Current" | "Saving" | "Mortgage" | "Loan" | "Credit Card" | "Investment" | "Pension";
  balance: number;
  interestRate?: number;
  monthlyContribution?: number;
  termMonths?: number;
  fixedRateEndDate?: string;
  isCurrent?: boolean;
  /** Month-end balance history, newest last: written to account_details. */
  history?: Array<{ year: number; month: number; value: number }>;
}

export interface SyntheticBudgetEntry {
  category: string;
  name: string;
  amount: number;
  isIncome?: boolean;
  isPrimaryIncome?: boolean;
  isEssential?: boolean;
  frequency?: "monthly" | "annual";
}

export interface SyntheticTaxRecord {
  type: "income" | "expense";
  source: string;
  category: string;
  name: string;
  amount: number;
  frequency: "monthly" | "annual" | "one-off";
  date: string;
}

export interface SyntheticPersona {
  key: PersonaKey;
  label: string;
  profile: {
    displayName: string;
    firstName: string;
    lastName: string;
    employmentType: "employed" | "self-employed" | "other";
    annualSalary: number;
    monthlyTakeHome: number;
    hasMortgage?: boolean;
    pensionPercent?: number;
    pensionEmployerPercent?: number;
    isSalarySacrifice?: boolean;
    hasRentalIncome?: boolean;
    rentalIncomeMonthly?: number;
    enabledPages: string[];
  };
  accounts: SyntheticAccount[];
  budget: SyntheticBudgetEntry[];
  tax: SyntheticTaxRecord[];
}

const ALL_PAGES = ["accounts", "budget", "savings", "forecast", "debt", "pension", "mortgage"];

const history = (start: number, step: number) =>
  [
    { year: 2026, month: 8 },
    { year: 2026, month: 9 },
    { year: 2026, month: 10 },
  ].map((m, i) => ({ ...m, value: start + step * i }));

const income = (amount: number): SyntheticBudgetEntry => ({
  category: "income",
  name: "Take-home pay",
  amount,
  isIncome: true,
  isPrimaryIncome: true,
});

export const SYNTHETIC_PERSONAS: Record<PersonaKey, SyntheticPersona> = {
  P1: {
    key: "P1",
    label: "Synthetic P1 (PAYE, renting, saving for a first home)",
    profile: {
      displayName: "Synthetic P1",
      firstName: "Synthetic",
      lastName: "P1",
      employmentType: "employed",
      annualSalary: 38000,
      monthlyTakeHome: 2380,
      pensionPercent: 5,
      pensionEmployerPercent: 3,
      enabledPages: ["accounts", "budget", "savings", "forecast"],
    },
    accounts: [
      { name: "Synthetic P1 Current", type: "Current", balance: 1250.5 },
      {
        name: "Synthetic P1 Lifetime ISA",
        type: "Saving",
        balance: 6400,
        interestRate: 4.25,
        monthlyContribution: 250,
        history: history(5900, 250),
      },
      { name: "Synthetic P1 Student Loan", type: "Loan", balance: -32000, interestRate: 4.3 },
    ],
    budget: [
      income(2380),
      { category: "housing", name: "Rent", amount: 950 },
      { category: "bills", name: "Broadband", amount: 35.99 },
      { category: "living", name: "Groceries and outgoings", amount: 450 },
      { category: "fun", name: "Subscriptions", amount: 25, isEssential: false },
    ],
    tax: [],
  },
  P2: {
    key: "P2",
    label: "Synthetic P2 (high earner, salary sacrifice, mortgage)",
    profile: {
      displayName: "Synthetic P2",
      firstName: "Synthetic",
      lastName: "P2",
      employmentType: "employed",
      annualSalary: 112000,
      monthlyTakeHome: 6200,
      hasMortgage: true,
      pensionPercent: 8,
      pensionEmployerPercent: 5,
      isSalarySacrifice: true,
      enabledPages: ALL_PAGES,
    },
    accounts: [
      { name: "Synthetic P2 Current", type: "Current", balance: 4300 },
      {
        name: "Synthetic P2 Mortgage",
        type: "Mortgage",
        balance: -240000, // every liability is stored negative (BE-05 stored-balance rule)
        interestRate: 4.1,
        termMonths: 240,
        fixedRateEndDate: "2028-03-31",
        monthlyContribution: 1450,
      },
      {
        name: "Synthetic P2 Workplace Pension",
        type: "Pension",
        balance: 98000,
        interestRate: 5,
        monthlyContribution: 750,
        history: history(96000, 700),
      },
      {
        name: "Synthetic P2 Store Card",
        type: "Credit Card",
        balance: -1800,
        interestRate: 22.9,
        monthlyContribution: 75,
      },
    ],
    budget: [
      income(6200),
      { category: "housing", name: "Mortgage payment", amount: 1450 },
      { category: "bills", name: "Childcare", amount: 1100 },
      { category: "living", name: "Groceries and outgoings", amount: 900 },
    ],
    tax: [],
  },
  P3: {
    key: "P3",
    label: "Synthetic P3 (saver planning retirement, mortgage near its end)",
    profile: {
      displayName: "Synthetic P3",
      firstName: "Synthetic",
      lastName: "P3",
      employmentType: "employed",
      annualSalary: 64000,
      monthlyTakeHome: 3900,
      hasMortgage: true,
      pensionPercent: 10,
      pensionEmployerPercent: 6,
      enabledPages: ALL_PAGES,
    },
    accounts: [
      { name: "Synthetic P3 Current", type: "Current", balance: 3100 },
      {
        name: "Synthetic P3 Cash ISA",
        type: "Saving",
        balance: 42000,
        interestRate: 4.5,
        monthlyContribution: 400,
        history: history(41000, 500),
      },
      {
        name: "Synthetic P3 SIPP",
        type: "Pension",
        balance: 310000,
        interestRate: 5,
        monthlyContribution: 1000,
        history: history(305000, 1500),
      },
      {
        name: "Synthetic P3 Stocks and Shares ISA",
        type: "Investment",
        balance: 58000,
        monthlyContribution: 300,
      },
      {
        name: "Synthetic P3 Mortgage",
        type: "Mortgage",
        balance: -28000,
        interestRate: 3.2,
        termMonths: 36,
        fixedRateEndDate: "2027-09-30",
        monthlyContribution: 800,
      },
    ],
    budget: [
      income(3900),
      { category: "housing", name: "Mortgage payment", amount: 800 },
      { category: "bills", name: "Utilities", amount: 220 },
      { category: "living", name: "Groceries and outgoings", amount: 650 },
    ],
    tax: [],
  },
  P5: {
    key: "P5",
    label: "Synthetic P5 (power user with rental and side income)",
    profile: {
      displayName: "Synthetic P5",
      firstName: "Synthetic",
      lastName: "P5",
      employmentType: "self-employed",
      annualSalary: 72000,
      monthlyTakeHome: 4300,
      hasRentalIncome: true,
      rentalIncomeMonthly: 650,
      enabledPages: [...ALL_PAGES, "tax"],
    },
    accounts: [
      { name: "Synthetic P5 Current", type: "Current", balance: 5200 },
      {
        name: "Synthetic P5 Easy Access Saver",
        type: "Saving",
        balance: 12000,
        interestRate: 4.25,
        monthlyContribution: 200,
      },
      {
        name: "Synthetic P5 Personal Pension",
        type: "Pension",
        balance: 27000,
        interestRate: 5,
        monthlyContribution: 300,
      },
    ],
    budget: [
      income(4300),
      { category: "income", name: "Rental income", amount: 650, isIncome: true },
      { category: "housing", name: "Rent", amount: 1200 },
      { category: "bills", name: "Software subscriptions", amount: 60, isEssential: false },
    ],
    tax: [
      {
        type: "income",
        source: "rental",
        category: "rent",
        name: "Synthetic P5 rental income",
        amount: 650,
        frequency: "monthly",
        date: "2026-04-06",
      },
      {
        type: "expense",
        source: "self-employment",
        category: "software",
        name: "Synthetic P5 software costs",
        amount: 720,
        frequency: "annual",
        date: "2026-04-06",
      },
    ],
  },
};
