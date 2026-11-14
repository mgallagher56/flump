import type { Page } from "@playwright/test";
import { FROZEN_NOW, SERVER_CLOCK_FROZEN } from "./clock";

/**
 * Two neutral sample households for the single dev-bypass user, written through the same-origin
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

export type PersonaName = "renter" | "homeowner";

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
}

export interface SeedBudgetEntry {
  name: string;
  category: string;
  amount: number;
  isIncome?: boolean;
  isEssential?: boolean;
}

export interface Persona {
  name: PersonaName;
  profile: Record<string, unknown>;
  accounts: SeedAccount[];
  budget: SeedBudgetEntry[];
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
    dashboardWidgetOrder: ["accounts", "budget", "savings", "debt", "pension"],
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
      monthlyContribution: 240,
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
    dashboardWidgetOrder: ["accounts", "budget", "savings", "debt", "pension", "mortgage"],
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
      monthlyContribution: 630,
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

export const PERSONAS: Record<PersonaName, Persona> = { renter: RENTER, homeowner: HOMEOWNER };

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
  const plan = planFor(PERSONAS[name], seedNow());
  const outcome = await page.evaluate(async (seed) => {
    const failures: string[] = [];
    const call = async (path: string, method = "GET", body?: unknown, allow404 = false) => {
      const response = await fetch(`/api${path}`, {
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
    };
    // A brand-new user has no profile row yet (404); the first PATCH creates it.
    const profile = (await call("/user-profile", "GET", undefined, true)) as Record<
      string,
      unknown
    > | null;
    const accounts = ((await call("/accounts")) as Row[] | null) ?? [];
    const entries = ((await call("/budget-entries")) as Row[] | null) ?? [];
    // History counts too: a run that died while writing months must be seeded again.
    const details =
      ((await call("/account-details")) as Array<{ month: number; year: number }> | null) ?? [];
    const monthsRecorded = new Set(details.map((d) => `${d.year}-${d.month}`)).size;
    if (failures.length > 0) return { failures, unchanged: false, reset: false };

    const sameSet = (a: string[], b: string[]) =>
      a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");
    const matches =
      profile?.onboardingCompleted === true &&
      profile.annualSalary === seed.profile.annualSalary &&
      monthsRecorded >= seed.history.length &&
      sameSet(
        accounts.map((a) => `${a.name}:${Math.abs(a.balance)}`),
        seed.accounts.map((a) => `${a.name}:${Math.abs(Number(a.balance))}`),
      ) &&
      sameSet(
        entries.map((e) => `${e.name}:${e.amount}:${Boolean(e.isEssential)}`),
        seed.budget.map((e) => `${e.name}:${e.amount}:${Boolean(e.isEssential)}`),
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
  }, plan);

  if (outcome.failures.length > 0) {
    throw new Error(
      `Seeding the ${name} persona through /api failed: ${outcome.failures.join(", ")}`,
    );
  }
  return { persona: name, unchanged: outcome.unchanged, reset: outcome.reset };
}
