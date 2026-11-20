import type { Page } from "@playwright/test";
import { FROZEN_NOW, SERVER_CLOCK_FROZEN } from "./clock";
import { recordDestructive } from "./destructive-budget";
import { BACKEND_URL } from "./env";
import { allowRateLimitRetry } from "./rate-limit-retry";
import { paceReads } from "./read-budget";

/**
 * Neutral sample households (two for the visual suite, three more for the phone audit) for the single dev-bypass user, written through the same-origin
 * `/api` proxy (the web server attaches the session token, so nothing here reads one).
 *
 * Switching is idempotent: when the stored accounts, budget and salary already match the persona,
 * nothing is written. Otherwise the user's financial data is cleared with
 * `POST /user-profile/reset-financial-data` (only when there is something to clear, so a fresh
 * database never spends the "destructive" rate-limit budget of 10 an hour) and the persona is
 * written again: profile facts, accounts, budget entries, then six past months of balances through
 * `PUT /snapshots/:month`, the endpoint the monthly check-in uses for past months.
 *
 * Dates are relative to FROZEN_NOW when the servers run under the frozen clock, else to today, so
 * the backend never sees a future month and visual runs stay deterministic.
 */

export type PersonaName =
  | "renter"
  | "homeowner"
  | "debtpayer"
  | "selfemployed"
  | "retiree"
  | "everything";

export interface SeedAccount {
  name: string;
  type: string;
  /** Today's balance; liabilities are given positive (the backend stores them negative). */
  balance: number;
  interestRate?: number;
  /** Debts: the minimum or agreed monthly payment. Pensions and savings: the monthly amount in. */
  monthlyContribution?: number;
  termMonths?: number;
  /** Months from the seed date to the end of the fixed rate (mortgages). */
  fixedRateEndsInMonths?: number;
  studentLoanPlan?: "PLAN_1" | "PLAN_2" | "PLAN_4" | "PLAN_5" | "POSTGRAD";
  /** How much the balance grew each month (negative for a debt being paid down). */
  monthlyChange: number;
  /** Held with someone else; the user's share is `sharePercent` (accounts that allow it). */
  ownership?: "sole" | "joint";
  sharePercent?: number;
}

export interface SeedBudgetEntry {
  name: string;
  category: string;
  amount: number;
  isIncome?: boolean;
  isEssential?: boolean;
  ownership?: "sole" | "joint";
  sharePercent?: number;
}

export interface Persona {
  name: PersonaName;
  profile: Record<string, unknown>;
  accounts: SeedAccount[];
  budget: SeedBudgetEntry[];
  /** Data beyond accounts and budget: only the "everything" persona has it (seedExtras). */
  extras?: PersonaExtras;
}

export interface PersonaExtras {
  /** Self Assessment records for the current tax year, monthly from its first day. */
  taxRecords: Array<{
    type: "income" | "expense";
    source: "paye" | "self-employed" | "rental" | "savings";
    category: string;
    name: string;
    amount: number;
  }>;
  retirementPlan: Record<string, unknown>;
  /** One AI connection (personal access token) by this name; its secret is never read. */
  aiConnectionName: string;
  /** One import committed onto this account, and one left staged for review. */
  importAccountName: string;
}

/** Months of history written before the current month. */
export const HISTORY_MONTHS = 6;

/** The instant seed dates are relative to. */
export function seedNow(): Date {
  return SERVER_CLOCK_FROZEN ? new Date(FROZEN_NOW) : new Date();
}

const birthYear = (age: number) => seedNow().getUTCFullYear() - age;

/** Age 29, renting, £32,000 salary, Plan 2 student loan, one credit card. */
export const RENTER: Persona = {
  name: "renter",
  profile: {
    firstName: "Sam",
    employmentType: "employed",
    annualSalary: 32000,
    monthlyTakeHome: 2085,
    taxRegion: "ENGLAND",
    birthYear: birthYear(29),
    studentLoanPlans: ["PLAN_2"],
    housingStatus: "renting",
    monthlyHousingCost: 950,
    monthlyOtherOutgoings: 800,
    hasMortgage: false,
    pensionPercent: 5,
    pensionEmployerPercent: 4,
    isSalarySacrifice: false,
    enabledPages: ["accounts", "budget", "savings", "debt", "pension"],
    dashboardWidgets: ["accounts", "budget", "savings", "debt", "pension"],
  },
  accounts: [
    { name: "Current account", type: "Current", balance: 1300, monthlyChange: 20 },
    {
      name: "Easy access savings",
      type: "Saving",
      balance: 3200,
      interestRate: 4,
      monthlyContribution: 150,
      monthlyChange: 150,
    },
    {
      name: "Workplace pension",
      type: "Pension",
      balance: 9000,
      interestRate: 5,
      // No monthlyContribution: the salary percentages above already pay into this pot, and the
      // pension page adds a pot's own contribution on top (it would count twice).
      monthlyChange: 260,
    },
    {
      name: "Credit card",
      type: "Credit Card",
      balance: 1800,
      interestRate: 24.9,
      monthlyContribution: 60,
      monthlyChange: -35,
    },
    {
      name: "Student loan",
      type: "Student Loan",
      balance: 38500,
      interestRate: 6.2,
      studentLoanPlan: "PLAN_2",
      monthlyChange: 120,
    },
  ],
  budget: [
    { name: "Salary after tax", category: "income", amount: 2085, isIncome: true },
    { name: "Rent", category: "housing", amount: 950, isEssential: true },
    { name: "Council tax", category: "bills", amount: 115, isEssential: true },
    { name: "Energy", category: "bills", amount: 80, isEssential: true },
    { name: "Phone and broadband", category: "bills", amount: 40, isEssential: true },
    { name: "Groceries", category: "expenses", amount: 250, isEssential: true },
    { name: "Travel", category: "expenses", amount: 120, isEssential: true },
    { name: "Eating out", category: "expenses", amount: 90 },
    { name: "Subscriptions", category: "expenses", amount: 25 },
    { name: "Everything else", category: "expenses", amount: 80 },
    { name: "Credit card payment", category: "bills", amount: 60, isEssential: true },
    { name: "Easy access savings", category: "savings", amount: 150 },
  ],
};

/** Age 44, repayment mortgage, £58,000 salary, a car loan and a credit card. */
export const HOMEOWNER: Persona = {
  name: "homeowner",
  profile: {
    firstName: "Alex",
    employmentType: "employed",
    annualSalary: 58000,
    monthlyTakeHome: 3450,
    taxRegion: "ENGLAND",
    birthYear: birthYear(44),
    studentLoanPlans: [],
    housingStatus: "mortgage",
    monthlyHousingCost: 1250,
    monthlyOtherOutgoings: 1500,
    hasMortgage: true,
    mortgageType: "repayment",
    propertyOwnershipShare: 100,
    pensionPercent: 8,
    pensionEmployerPercent: 5,
    isSalarySacrifice: false,
    enabledPages: ["accounts", "budget", "savings", "debt", "pension", "mortgage"],
    dashboardWidgets: ["accounts", "budget", "savings", "debt", "pension", "mortgage"],
  },
  accounts: [
    { name: "Current account", type: "Current", balance: 3400, monthlyChange: 40 },
    {
      name: "Easy access savings",
      type: "Saving",
      balance: 7600,
      interestRate: 4,
      monthlyContribution: 200,
      monthlyChange: 220,
    },
    {
      name: "Cash ISA",
      type: "Saving",
      balance: 10000,
      interestRate: 4.2,
      monthlyContribution: 100,
      monthlyChange: 135,
    },
    { name: "Home", type: "Property", balance: 310000, monthlyChange: 500 },
    {
      // 4.5% over 218 months on £186,000 is a £1,250 monthly repayment.
      name: "Residential mortgage",
      type: "Mortgage",
      balance: 186000,
      interestRate: 4.5,
      termMonths: 218,
      monthlyContribution: 1250,
      fixedRateEndsInMonths: 20,
      monthlyChange: -550,
    },
    {
      name: "Workplace pension",
      type: "Pension",
      balance: 96000,
      interestRate: 5,
      // No monthlyContribution: the salary percentages above already pay into this pot, and the
      // pension page adds a pot's own contribution on top (it would count twice).
      monthlyChange: 900,
    },
    {
      name: "Car loan",
      type: "Loan",
      balance: 8400,
      interestRate: 7.9,
      monthlyContribution: 265,
      termMonths: 34,
      monthlyChange: -210,
    },
    {
      name: "Credit card",
      type: "Credit Card",
      balance: 1200,
      interestRate: 22.9,
      monthlyContribution: 40,
      monthlyChange: -20,
    },
  ],
  budget: [
    { name: "Salary after tax", category: "income", amount: 3450, isIncome: true },
    { name: "Mortgage payment", category: "housing", amount: 1250, isEssential: true },
    { name: "Council tax", category: "bills", amount: 190, isEssential: true },
    { name: "Energy", category: "bills", amount: 140, isEssential: true },
    { name: "Water", category: "bills", amount: 45, isEssential: true },
    { name: "Phone and broadband", category: "bills", amount: 55, isEssential: true },
    { name: "Home insurance", category: "bills", amount: 30, isEssential: true },
    { name: "Car loan payment", category: "bills", amount: 265, isEssential: true },
    { name: "Groceries", category: "expenses", amount: 520, isEssential: true },
    { name: "Travel", category: "expenses", amount: 180, isEssential: true },
    { name: "Eating out", category: "expenses", amount: 120 },
    { name: "Subscriptions", category: "expenses", amount: 40 },
    { name: "Everything else", category: "expenses", amount: 180 },
    { name: "Cash ISA", category: "savings", amount: 100 },
    { name: "Easy access savings", category: "savings", amount: 200 },
  ],
};

/**
 * Age 36, renting, £41,000 salary, two credit cards, a personal loan and an overdraft being paid
 * down (phone audit 2026-11, the debt journey).
 */
export const DEBT_PAYER: Persona = {
  name: "debtpayer",
  profile: {
    firstName: "Jordan",
    employmentType: "employed",
    annualSalary: 41000,
    monthlyTakeHome: 2610,
    taxRegion: "SCOTLAND",
    birthYear: birthYear(36),
    studentLoanPlans: [],
    housingStatus: "renting",
    monthlyHousingCost: 850,
    monthlyOtherOutgoings: 900,
    hasMortgage: false,
    pensionPercent: 5,
    pensionEmployerPercent: 3,
    isSalarySacrifice: false,
    enabledPages: ["accounts", "budget", "debt", "savings", "pension"],
    dashboardWidgets: ["accounts", "debt", "budget", "savings", "pension"],
  },
  accounts: [
    { name: "Current account", type: "Current", balance: 640, monthlyChange: 10 },
    {
      name: "Rainy day pot",
      type: "Saving",
      balance: 500,
      interestRate: 3.5,
      monthlyContribution: 25,
      monthlyChange: 25,
    },
    {
      name: "Workplace pension",
      type: "Pension",
      balance: 21000,
      interestRate: 5,
      monthlyChange: 280,
    },
    {
      name: "Everyday card",
      type: "Credit Card",
      balance: 3100,
      interestRate: 26.9,
      monthlyContribution: 150,
      monthlyChange: -80,
    },
    {
      name: "Balance transfer card",
      type: "Credit Card",
      balance: 4200,
      interestRate: 0,
      monthlyContribution: 175,
      monthlyChange: -175,
    },
    {
      name: "Personal loan",
      type: "Loan",
      balance: 6800,
      interestRate: 9.4,
      monthlyContribution: 230,
      termMonths: 33,
      monthlyChange: -180,
    },
    {
      name: "Overdraft",
      type: "Overdraft",
      balance: 400,
      interestRate: 39.9,
      monthlyContribution: 50,
      monthlyChange: -50,
    },
  ],
  budget: [
    { name: "Salary after tax", category: "income", amount: 2610, isIncome: true },
    { name: "Rent", category: "housing", amount: 850, isEssential: true },
    { name: "Council tax", category: "bills", amount: 120, isEssential: true },
    { name: "Energy", category: "bills", amount: 95, isEssential: true },
    { name: "Phone and broadband", category: "bills", amount: 45, isEssential: true },
    { name: "Groceries", category: "expenses", amount: 300, isEssential: true },
    { name: "Travel", category: "expenses", amount: 110, isEssential: true },
    { name: "Everyday card payment", category: "bills", amount: 150, isEssential: true },
    { name: "Balance transfer payment", category: "bills", amount: 175, isEssential: true },
    { name: "Personal loan payment", category: "bills", amount: 230, isEssential: true },
    { name: "Overdraft payment", category: "bills", amount: 50, isEssential: true },
    { name: "Everything else", category: "expenses", amount: 140 },
    { name: "Rainy day pot", category: "savings", amount: 25 },
  ],
};

/**
 * Age 47, self-employed with one rented-out flat as well as the home they own outright: Self
 * Assessment switched on (phone audit 2026-11, the Self Assessment journey).
 */
export const SELF_EMPLOYED: Persona = {
  name: "selfemployed",
  profile: {
    firstName: "Robin",
    employmentType: "self-employed",
    annualSalary: 46000,
    monthlyTakeHome: 3050,
    taxRegion: "WALES",
    birthYear: birthYear(47),
    studentLoanPlans: [],
    housingStatus: "own_outright",
    monthlyHousingCost: 0,
    monthlyOtherOutgoings: 1300,
    hasMortgage: false,
    hasRentalIncome: true,
    rentalIncomeMonthly: 875,
    pensionPercent: 0,
    pensionEmployerPercent: 0,
    isSalarySacrifice: false,
    enabledPages: ["accounts", "budget", "savings", "pension", "mortgage", "tax"],
    dashboardWidgets: ["accounts", "tax", "budget", "savings", "pension"],
  },
  accounts: [
    { name: "Business current account", type: "Current", balance: 6200, monthlyChange: 120 },
    { name: "Personal current account", type: "Current", balance: 1900, monthlyChange: 30 },
    {
      name: "Tax pot",
      type: "Saving",
      balance: 7400,
      interestRate: 4.1,
      monthlyContribution: 650,
      monthlyChange: 650,
    },
    { name: "Home", type: "Property", balance: 240000, monthlyChange: 300 },
    { name: "Rental flat", type: "Property", balance: 165000, monthlyChange: 200 },
    {
      name: "Buy-to-let mortgage",
      type: "Mortgage",
      balance: 92000,
      interestRate: 5.1,
      termMonths: 180,
      monthlyContribution: 391,
      fixedRateEndsInMonths: 7,
      monthlyChange: 0,
    },
    {
      name: "Personal pension",
      type: "Pension",
      balance: 54000,
      interestRate: 5,
      monthlyContribution: 300,
      monthlyChange: 520,
    },
  ],
  budget: [
    { name: "Drawings", category: "income", amount: 3050, isIncome: true },
    { name: "Rent from the flat", category: "income", amount: 875, isIncome: true },
    { name: "Buy-to-let mortgage", category: "housing", amount: 391, isEssential: true },
    { name: "Council tax", category: "bills", amount: 170, isEssential: true },
    { name: "Energy", category: "bills", amount: 120, isEssential: true },
    { name: "Phone and broadband", category: "bills", amount: 60, isEssential: true },
    { name: "Groceries", category: "expenses", amount: 400, isEssential: true },
    { name: "Travel", category: "expenses", amount: 150, isEssential: true },
    { name: "Everything else", category: "expenses", amount: 260 },
    { name: "Tax pot", category: "savings", amount: 650 },
    { name: "Personal pension", category: "savings", amount: 300 },
  ],
};

/**
 * Age 61, owns their home outright, two workplace pensions and a SIPP, Retirement plan switched
 * on (phone audit 2026-11, the Pension and Retirement journey).
 */
export const NEAR_RETIREMENT: Persona = {
  name: "retiree",
  profile: {
    firstName: "Morgan",
    employmentType: "employed",
    annualSalary: 38000,
    monthlyTakeHome: 2480,
    taxRegion: "NORTHERN_IRELAND",
    birthYear: birthYear(61),
    studentLoanPlans: [],
    housingStatus: "own_outright",
    monthlyHousingCost: 0,
    monthlyOtherOutgoings: 1250,
    hasMortgage: false,
    pensionPercent: 10,
    pensionEmployerPercent: 6,
    isSalarySacrifice: true,
    enabledPages: ["accounts", "budget", "savings", "pension", "retirement"],
    dashboardWidgets: ["accounts", "pension", "retirement", "savings", "budget"],
  },
  accounts: [
    { name: "Joint current account", type: "Current", balance: 2700, monthlyChange: 20 },
    {
      name: "Stocks and shares ISA",
      type: "Investment",
      balance: 48000,
      interestRate: 5,
      monthlyContribution: 200,
      monthlyChange: 400,
    },
    {
      name: "Premium bonds",
      type: "Saving",
      balance: 15000,
      interestRate: 3.6,
      monthlyChange: 0,
    },
    { name: "Home", type: "Property", balance: 285000, monthlyChange: 350 },
    {
      name: "Current workplace pension",
      type: "Pension",
      balance: 142000,
      interestRate: 5,
      monthlyChange: 1100,
    },
    {
      name: "Earlier workplace pension",
      type: "Pension",
      balance: 63000,
      interestRate: 4,
      monthlyChange: 210,
    },
    {
      name: "SIPP",
      type: "Pension",
      balance: 37000,
      interestRate: 5,
      monthlyContribution: 150,
      monthlyChange: 300,
    },
  ],
  budget: [
    { name: "Salary after tax", category: "income", amount: 2480, isIncome: true },
    { name: "Rates", category: "bills", amount: 110, isEssential: true },
    { name: "Energy", category: "bills", amount: 130, isEssential: true },
    { name: "Phone and broadband", category: "bills", amount: 50, isEssential: true },
    { name: "Home insurance", category: "bills", amount: 35, isEssential: true },
    { name: "Groceries", category: "expenses", amount: 420, isEssential: true },
    { name: "Travel", category: "expenses", amount: 160, isEssential: true },
    { name: "Holidays", category: "expenses", amount: 200 },
    { name: "Everything else", category: "expenses", amount: 210 },
    { name: "Stocks and shares ISA", category: "savings", amount: 200 },
    { name: "SIPP", category: "savings", amount: 150 },
  ],
};

/**
 * Age 52, one person who uses every page (phone audit 2026-11, J11): employed with self-employed
 * work on the side, a home with a residential mortgage whose fix ends in 4 months, a let flat, a
 * joint current account and joint bills, savings in and outside ISAs, investments, cards and
 * loans, two pensions, a retirement plan, Self Assessment records, an AI connection and imports,
 * with every optional page switched on. The densest household: long lists and large figures.
 */
export const EVERYTHING: Persona = {
  name: "everything",
  profile: {
    firstName: "Charlie",
    employmentType: "employed",
    annualSalary: 74000,
    monthlyTakeHome: 4310,
    taxRegion: "ENGLAND",
    birthYear: birthYear(52),
    studentLoanPlans: ["PLAN_1"],
    secondIncomeMonthly: 1100,
    hasRentalIncome: true,
    rentalIncomeMonthly: 1150,
    housingStatus: "mortgage",
    monthlyHousingCost: 1680,
    monthlyOtherOutgoings: 2100,
    hasMortgage: true,
    mortgageType: "repayment",
    propertyOwnershipShare: 50,
    pensionPercent: 7,
    pensionEmployerPercent: 7,
    isSalarySacrifice: true,
    enabledPages: [
      "accounts",
      "budget",
      "savings",
      "debt",
      "pension",
      "retirement",
      "mortgage",
      "tax",
    ],
    dashboardWidgets: [
      "accounts",
      "budget",
      "savings",
      "debt",
      "pension",
      "retirement",
      "mortgage",
      "tax",
    ],
  },
  accounts: [
    {
      name: "Joint current account",
      type: "Current",
      balance: 4800,
      monthlyChange: 60,
      ownership: "joint",
      sharePercent: 50,
    },
    { name: "Personal current account", type: "Current", balance: 2350, monthlyChange: 25 },
    { name: "Business account", type: "Current", balance: 5600, monthlyChange: 180 },
    {
      name: "Easy access savings",
      type: "Saving",
      balance: 12400,
      interestRate: 4.3,
      monthlyContribution: 250,
      monthlyChange: 290,
    },
    {
      name: "Cash ISA",
      type: "Saving",
      balance: 20000,
      interestRate: 4.5,
      monthlyContribution: 300,
      monthlyChange: 370,
    },
    {
      name: "Stocks and shares ISA",
      type: "Investment",
      balance: 86500,
      interestRate: 5,
      monthlyContribution: 500,
      monthlyChange: 860,
    },
    {
      name: "General investment account",
      type: "Investment",
      balance: 31200,
      interestRate: 5,
      monthlyChange: 130,
    },
    {
      name: "Home",
      type: "Property",
      balance: 525000,
      monthlyChange: 900,
      ownership: "joint",
      sharePercent: 50,
    },
    {
      // 4.2% over 240 months on £312,000 is about £1,924 a month; the user's half is £962.
      name: "Residential mortgage",
      type: "Mortgage",
      balance: 312000,
      interestRate: 4.2,
      termMonths: 240,
      monthlyContribution: 1924,
      fixedRateEndsInMonths: 4,
      monthlyChange: -820,
      ownership: "joint",
      sharePercent: 50,
    },
    { name: "Rental flat", type: "Property", balance: 230000, monthlyChange: 250 },
    {
      name: "Buy-to-let mortgage",
      type: "Mortgage",
      balance: 138000,
      interestRate: 5.4,
      termMonths: 204,
      monthlyContribution: 621,
      fixedRateEndsInMonths: 26,
      monthlyChange: 0,
    },
    {
      name: "Workplace pension",
      type: "Pension",
      balance: 241000,
      interestRate: 5,
      monthlyChange: 2100,
    },
    {
      name: "Personal pension",
      type: "Pension",
      balance: 58700,
      interestRate: 5,
      monthlyContribution: 250,
      monthlyChange: 480,
    },
    {
      name: "Rewards credit card",
      type: "Credit Card",
      balance: 2650,
      interestRate: 23.9,
      monthlyContribution: 400,
      monthlyChange: -60,
    },
    {
      name: "Car finance",
      type: "Loan",
      balance: 14300,
      interestRate: 6.9,
      monthlyContribution: 395,
      termMonths: 40,
      monthlyChange: -310,
    },
    {
      name: "Student loan",
      type: "Student Loan",
      balance: 6100,
      interestRate: 4.3,
      studentLoanPlan: "PLAN_1",
      monthlyChange: -120,
    },
  ],
  budget: [
    { name: "Salary after tax", category: "income", amount: 4310, isIncome: true },
    { name: "Self-employed work", category: "income", amount: 1100, isIncome: true },
    { name: "Rent from the flat", category: "income", amount: 1150, isIncome: true },
    {
      name: "Mortgage payment",
      category: "housing",
      amount: 1924,
      isEssential: true,
      ownership: "joint",
      sharePercent: 50,
    },
    { name: "Buy-to-let mortgage", category: "housing", amount: 621, isEssential: true },
    {
      name: "Council tax",
      category: "bills",
      amount: 260,
      isEssential: true,
      ownership: "joint",
      sharePercent: 50,
    },
    {
      name: "Energy",
      category: "bills",
      amount: 210,
      isEssential: true,
      ownership: "joint",
      sharePercent: 50,
    },
    {
      name: "Water",
      category: "bills",
      amount: 60,
      isEssential: true,
      ownership: "joint",
      sharePercent: 50,
    },
    { name: "Phone and broadband", category: "bills", amount: 85, isEssential: true },
    { name: "Home insurance", category: "bills", amount: 45, isEssential: true },
    { name: "Landlord insurance", category: "bills", amount: 32, isEssential: true },
    { name: "Car finance payment", category: "bills", amount: 395, isEssential: true },
    { name: "Credit card payment", category: "bills", amount: 400, isEssential: true },
    {
      name: "Groceries",
      category: "expenses",
      amount: 780,
      isEssential: true,
      ownership: "joint",
      sharePercent: 50,
    },
    { name: "Travel", category: "expenses", amount: 240, isEssential: true },
    { name: "Childcare and school costs", category: "expenses", amount: 520, isEssential: true },
    { name: "Eating out", category: "expenses", amount: 180 },
    { name: "Subscriptions", category: "expenses", amount: 65 },
    { name: "Holidays", category: "expenses", amount: 300 },
    { name: "Gifts and celebrations", category: "expenses", amount: 90 },
    { name: "Everything else", category: "expenses", amount: 250 },
    { name: "Cash ISA", category: "savings", amount: 300 },
    { name: "Easy access savings", category: "savings", amount: 250 },
    { name: "Stocks and shares ISA", category: "savings", amount: 500 },
    { name: "Personal pension", category: "savings", amount: 250 },
  ],
  extras: {
    taxRecords: [
      {
        type: "income",
        source: "self-employed",
        category: "self_employed_income",
        name: "Design work",
        amount: 1100,
      },
      {
        type: "expense",
        source: "self-employed",
        category: "office_costs",
        name: "Software",
        amount: 45,
      },
      {
        type: "income",
        source: "rental",
        category: "rental_income",
        name: "Rent from the flat",
        amount: 1150,
      },
      {
        type: "expense",
        source: "rental",
        category: "rent_rates_insurance",
        name: "Landlord insurance",
        amount: 32,
      },
      {
        type: "expense",
        source: "rental",
        category: "legal_management_fees",
        name: "Letting agent fees",
        amount: 115,
      },
    ],
    retirementPlan: {
      retirementAge: 63,
      planToAge: 95,
      target: { kind: "typed", yearlyAmount: 36000 },
      statePensionAge: 67,
    },
    aiConnectionName: "Audit assistant",
    importAccountName: "General investment account",
  },
};

export const PERSONAS: Record<PersonaName, Persona> = {
  renter: RENTER,
  homeowner: HOMEOWNER,
  debtpayer: DEBT_PAYER,
  selfemployed: SELF_EMPLOYED,
  retiree: NEAR_RETIREMENT,
  everything: EVERYTHING,
};

const pad = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM" for `back` months before `now` (UTC; seed instants are mid-month, mid-day). */
export function monthKey(now: Date, back: number): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

/** The last day of the month `ahead` months after `now`, as YYYY-MM-DD. */
function monthEnd(now: Date, ahead: number): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + ahead + 1, 0));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

interface SeedPlan {
  persona: PersonaName;
  profile: Record<string, unknown>;
  accounts: Array<Record<string, unknown>>;
  budget: SeedBudgetEntry[];
  /** Oldest first: the month and each account's value, in `accounts` order. */
  history: Array<{ month: string; values: number[] }>;
}

function planFor(persona: Persona, now: Date): SeedPlan {
  const accounts = persona.accounts.map(
    ({ monthlyChange: _change, fixedRateEndsInMonths, ...account }) => ({
      ...account,
      currency: "GBP",
      ...(fixedRateEndsInMonths ? { fixedRateEndDate: monthEnd(now, fixedRateEndsInMonths) } : {}),
    }),
  );
  const history = Array.from({ length: HISTORY_MONTHS }, (_, i) => {
    const back = HISTORY_MONTHS - i;
    return {
      month: monthKey(now, back),
      values: persona.accounts.map((a) => round2(Math.max(0, a.balance - a.monthlyChange * back))),
    };
  });
  return {
    persona: persona.name,
    profile: persona.profile,
    accounts,
    budget: persona.budget,
    history,
  };
}

export interface PersonaResult {
  persona: PersonaName;
  /** True when the stored data already matched and nothing was written. */
  unchanged: boolean;
  reset: boolean;
}

/**
 * Makes the signed-in dev user look like `persona`. The page must be on the web app's origin
 * with a session (global setup signs in first). Throws with every failing status.
 */
export async function applyPersona(page: Page, name: PersonaName): Promise<PersonaResult> {
  // Smoke suite: wait for the user's next read window if this one is nearly spent (read-budget.ts).
  await paceReads();
  const plan = planFor(PERSONAS[name], seedNow());
  const binding = await allowRateLimitRetry(page);
  const outcome = await page.evaluate(
    async ({ seed, binding }) => {
      const failures: string[] = [];
      // On a 429, the Node side decides whether to wait and retry once (rate-limit-retry.ts,
      // onRateLimited). No binding: this suite does not retry.
      const send = async (path: string, init: RequestInit): Promise<Response> => {
        const response = await fetch(`/api${path}`, init);
        if (response.status !== 429 || !binding) return response;
        const decide = (window as unknown as Record<string, unknown>)[binding] as (
          method: string,
          path: string,
          retryAfter: string | null,
        ) => Promise<number | null>;
        const waitMs = await decide(
          init.method ?? "GET",
          path,
          response.headers.get("Retry-After"),
        );
        if (waitMs === null) return response;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        return fetch(`/api${path}`, init);
      };
      const call = async (path: string, method = "GET", body?: unknown, allow404 = false) => {
        const response = await send(path, {
          method,
          headers: { "Content-Type": "application/json", "x-flump-request": "1" },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        if (!response.ok && !(allow404 && response.status === 404)) {
          failures.push(`${method} ${path} ${response.status}`);
        }
        return response.ok ? ((await response.json()) as unknown) : null;
      };

      type Row = {
        id: string;
        name: string;
        balance: number;
        amount?: number;
        isEssential?: boolean;
        frequency?: string;
      };
      // A brand-new user has no profile row yet (404); the first PATCH creates it.
      const profile = (await call("/user-profile", "GET", undefined, true)) as Record<
        string,
        unknown
      > | null;
      const accounts = ((await call("/accounts")) as Row[] | null) ?? [];
      const entries = ((await call("/budget-entries")) as Row[] | null) ?? [];
      if (failures.length > 0) return { failures, unchanged: false, reset: false };

      const sameSet = (a: string[], b: string[]) =>
        a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");
      // The browser proxy allows no GET of the profile (services/api-proxy.server.ts), so the
      // profile reads as null here; then only the accounts and budget decide. Without this, every
      // call reset the user and wrote the persona again, which hits the backend's rate limits.
      const profileMatches =
        profile === null ||
        (profile.onboardingCompleted === true &&
          profile.annualSalary === seed.profile.annualSalary);
      const matches =
        profileMatches &&
        sameSet(
          accounts.map((a) => `${a.name}:${Math.abs(a.balance)}`),
          seed.accounts.map((a) => `${a.name}:${Math.abs(Number(a.balance))}`),
        ) &&
        sameSet(
          // Frequency too (E11): a line left at a changed frequency must not pass as the persona's.
          entries.map(
            (e) => `${e.name}:${e.amount}:${Boolean(e.isEssential)}:${e.frequency ?? "monthly"}`,
          ),
          seed.budget.map(
            (e) =>
              `${e.name}:${e.amount}:${Boolean(e.isEssential)}:${(e as { frequency?: string }).frequency ?? "monthly"}`,
          ),
        );
      if (matches) return { failures, unchanged: true, reset: false };

      const hasData = accounts.length > 0 || entries.length > 0 || profile?.annualSalary != null;
      if (hasData)
        await call("/user-profile/reset-financial-data", "POST", { confirmation: "RESET" });
      if (failures.length > 0) return { failures, unchanged: false, reset: hasData };

      // Onboarded first: finishing onboarding after the accounts exist would record this month's
      // snapshot (E30 D8), and the persona is a returning user whose check-in is still due.
      await call("/user-profile", "PATCH", { ...seed.profile, onboardingCompleted: true });
      const ids: string[] = [];
      for (const account of seed.accounts) {
        const created = (await call("/accounts", "POST", account)) as { id: string } | null;
        ids.push(created?.id ?? "");
      }
      for (const entry of seed.budget) {
        // The backend stores a row as essential unless told otherwise.
        await call("/budget-entries", "POST", {
          frequency: "monthly",
          isIncome: false,
          isEssential: false,
          ...entry,
        });
      }
      if (failures.length === 0) {
        for (const { month, values } of seed.history) {
          await call(`/snapshots/${month}`, "PUT", {
            values: values.map((value, i) => ({ accountId: ids[i], value })),
            complete: true,
          });
        }
      }
      return { failures, unchanged: false, reset: hasData };
    },
    { seed: plan, binding },
  );

  if (outcome.reset) recordDestructive("POST", "/user-profile/reset-financial-data");
  if (outcome.failures.length > 0) {
    throw new Error(
      `Seeding the ${name} persona through /api failed: ${outcome.failures.join(", ")}`,
    );
  }
  const extras = PERSONAS[name].extras;
  if (extras) await seedExtras(extras);
  return { persona: name, unchanged: outcome.unchanged, reset: outcome.reset };
}

/** The first day of the UK tax year (6 April) that `now` falls in, as YYYY-MM-DD. */
export function taxYearStart(now: Date): string {
  const y = now.getUTCFullYear();
  const beforeApril6 = now.getUTCMonth() < 3 || (now.getUTCMonth() === 3 && now.getUTCDate() < 6);
  return `${beforeApril6 ? y - 1 : y}-04-06`;
}

/**
 * Self Assessment records, the retirement plan, an AI connection and two imports (one committed,
 * one staged for review). Each is written only when missing, so a re-run adds nothing. The AI
 * connection's secret comes back in the response and is dropped unread. Throws on any failure.
 */
async function seedExtras(extras: PersonaExtras): Promise<void> {
  const now = seedNow();
  const seed = {
    extras,
    taxYearStart: taxYearStart(now),
    commitMonth: monthKey(now, HISTORY_MONTHS + 3),
    stageMonth: monthKey(now, HISTORY_MONTHS + 2),
  };
  // Tax records, the retirement plan and imports are not on the web app's /api allow-list (the
  // app writes them through its own server routes), so these go straight to the local test
  // backend as the dev-bypass user, with the public dev constant the web server itself uses
  // (apps/web/app/utils/auth.server.ts DEV_ACCESS_TOKEN). Only a dev-bypass backend accepts it.
  const auth = { Authorization: `Bearer ${["mock", "session", "token"].join("-")}` };
  const failures = await (async (s: typeof seed) => {
    const failures: string[] = [];
    const call = async (path: string, method = "GET", body?: unknown, headers = {}) => {
      const response = await fetch(`${BACKEND_URL}${path}`, {
        method,
        headers: { "Content-Type": "application/json", ...auth, ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!response.ok) failures.push(`${method} ${path} ${response.status}`);
      const json = response.ok ? ((await response.json().catch(() => null)) as unknown) : null;
      return { json, etag: response.headers.get("etag") };
    };
    const rows = (json: unknown): Array<Record<string, unknown>> =>
      Array.isArray(json)
        ? json
        : ((
            json as {
              items?: Array<Record<string, unknown>>;
              data?: Array<Record<string, unknown>>;
            }
          )?.items ??
          (json as { data?: Array<Record<string, unknown>> })?.data ??
          []);

    const records = rows((await call("/tax-records")).json);
    for (const record of s.extras.taxRecords) {
      if (records.some((r) => r.name === record.name)) continue;
      await call("/tax-records", "POST", { ...record, frequency: "monthly", date: s.taxYearStart });
    }

    const plan = await call("/retirement-plan");
    const saved = (plan.json as { plan?: { id?: string | null } } | null)?.plan;
    if (!saved?.id) await call("/retirement-plan", "PUT", s.extras.retirementPlan);

    const tokens = rows((await call("/mcp-tokens")).json);
    if (!tokens.some((t) => t.name === s.extras.aiConnectionName)) {
      // The response carries the new secret; it is not kept or returned.
      await call("/mcp-tokens", "POST", { name: s.extras.aiConnectionName, expiryDays: 90 });
    }

    const batches = rows((await call("/imports")).json);
    if (batches.length === 0) {
      const accounts = rows((await call("/accounts")).json);
      const target = accounts.find((a) => a.name === s.extras.importAccountName);
      const stage = async (key: string, month: string) =>
        (
          await call("/imports", "POST", {
            idempotencyKey: key,
            accounts: [{ ref: "acc1", name: s.extras.importAccountName, type: "Investment" }],
            balances: [{ accountRef: "acc1", month, value: 29800 }],
          })
        ).json as { id?: string; batch?: { id?: string } } | null;
      const committed = await stage("phone-audit-commit", s.commitMonth);
      const id = committed?.id ?? committed?.batch?.id;
      if (id && target?.id)
        await call(`/imports/${id}/commit`, "POST", { accountMap: { acc1: target.id } });
      await stage("phone-audit-staged", s.stageMonth);
    }
    return failures;
  })(seed);
  if (failures.length > 0) {
    throw new Error(`Seeding the persona's extra data through /api failed: ${failures.join(", ")}`);
  }
}

/**
 * Makes the signed-in dev user a brand-new one: no accounts, no budget, no profile facts, and
 * setup not finished. The page must be on the web app's origin with a session. The suite has one
 * user, so only a spec that runs after the persona specs may call this (see the `new-user`
 * project in playwright.config.ts). Spends one of the ten resets an hour.
 */
export async function clearToNewUser(page: Page): Promise<void> {
  recordDestructive("POST", "/user-profile/reset-financial-data");
  const status = await page.evaluate(async () => {
    const response = await fetch("/api/user-profile/reset-financial-data", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-flump-request": "1" },
      body: JSON.stringify({ confirmation: "RESET" }),
    });
    return response.status;
  });
  if (status !== 200) {
    throw new Error(`Clearing the dev user through /api failed: POST reset ${status}`);
  }
}
