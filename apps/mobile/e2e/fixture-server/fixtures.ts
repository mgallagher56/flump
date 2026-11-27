/**
 * Canned `/v1` bodies (E12 S2c, and the monthly check-in's data since S3). Each is parsed with its contract schema whenever it is built: once
 * when the server starts, so a contract change that breaks a canned body stops the server (and its
 * tests) before any flow runs, and again on each request.
 */
import { randomUUID } from "node:crypto";
import {
  type AccountDetailDto,
  AccountDetailListResponse,
  AccountListResponse,
  type AccountWithDetailsDto,
  BudgetEntryListResponse,
  ClientPolicyResponse,
  SnapshotCheckInsResponse,
  type UpsertSnapshotRequest,
  UpsertSnapshotResponse,
  type UserProfileResponse,
  UserProfileResponse as UserProfileSchema,
} from "@flump/api-contract";
import {
  addCheckInMonths,
  buildCheckInSteps,
  type CheckInStep,
  compareCheckInMonths,
  getUkCalendarDate,
} from "@flump/finance-engine";

/** The person the stand-in signs in. Made up; the address is on the reserved example.com domain. */
export const FIXTURE_PERSON = {
  firstName: "Sam",
  lastName: "Taylor",
  email: "sam.taylor@example.com",
} as const;

/**
 * The canned profile. `facts` are a household's own answers (salary, region, student loan and so
 * on, from `apps/e2e/support/personas.ts`), laid over the defaults.
 */
export function cannedProfile(
  userId: string,
  now: Date,
  facts: Partial<UserProfileResponse> = {},
): UserProfileResponse {
  return UserProfileSchema.parse({
    id: randomUUID(),
    userId,
    email: FIXTURE_PERSON.email,
    firstName: FIXTURE_PERSON.firstName,
    lastName: FIXTURE_PERSON.lastName,
    avatarUrl: null,
    currency: "GBP",
    country: "GB",
    employmentType: null,
    annualSalary: null,
    monthlyTakeHome: null,
    secondIncomeMonthly: null,
    hasRentalIncome: false,
    rentalIncomeMonthly: null,
    hasMortgage: false,
    mortgageType: "repayment",
    propertyOwnershipShare: 100,
    pensionPercent: null,
    pensionEmployerPercent: null,
    isSalarySacrifice: null,
    isSalarySacrificeEmployerNi: false,
    setupChecklistCompletedSteps: [],
    setupChecklistDismissed: false,
    customBudgetCategories: [],
    enabledPages: [],
    dashboardWidgets: [],
    dashboardWidgetOrder: [],
    hasResetFinancialData: false,
    onboardingCompleted: true,
    taxRegion: null,
    birthYear: null,
    checkInDay: null,
    wellbeingQuestions: true,
    studentLoanPlans: null,
    housingStatus: null,
    monthlyHousingCost: null,
    monthlyOtherOutgoings: null,
    netWorthCountsProperty: true,
    netWorthCountsStudentLoan: false,
    partnerMode: false,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    ...facts,
  });
}

export function cannedClientPolicy(minVersion: string) {
  const platform = { minVersion, recommendedVersion: minVersion };
  return ClientPolicyResponse.parse({ ios: platform, android: platform });
}

/* ------------------------------------------------------------------------------------------ */
/* Monthly check-in (E12 S3, plan section 9.6)                                                 */
/* ------------------------------------------------------------------------------------------ */

/** The account types the backend stores negative whatever sign was sent (BE-05). */
const LIABILITY_TYPES: ReadonlySet<string> = new Set([
  "Mortgage",
  "Credit Card",
  "Loan",
  "Overdraft",
  "Student Loan",
]);

/** The check-in's data: accounts (saved order), their monthly rows and the two check-in months. */
export interface CheckInStore {
  accounts: AccountWithDetailsDto[];
  details: AccountDetailDto[];
  latestStartedMonth: string | null;
  latestCompletedMonth: string | null;
  nextDetailId: number;
}

/** "YYYY-MM": the London calendar month of `now`. */
export function londonMonth(now: Date): string {
  return getUkCalendarDate(now).slice(0, 7);
}

/** "YYYY-MM-DD": the last day of a "YYYY-MM" month. */
function lastDayOfMonth(month: string): string {
  const [year, m] = month.split("-").map(Number) as [number, number];
  // Day 0 of the next month is the last day of this one.
  const day = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return `${month}-${String(day).padStart(2, "0")}`;
}

interface SeedAccount {
  name: string;
  type: AccountWithDetailsDto["type"];
  subtype: AccountWithDetailsDto["accountSubtype"];
  balance: number;
  /** The month before the previous one, when this account has it. */
  older?: number;
  mortgage?: { interestRate: number; monthlyContribution: number; termMonths: number };
}

/**
 * Saved order, which is not web's check-in order, so the app's sort is exercised. The mortgage's
 * balance equals its previous-month row, so the engine offers a calculated figure for it.
 */
const SEED: readonly SeedAccount[] = [
  {
    name: "Mortgage",
    type: "Mortgage",
    subtype: "residential_mortgage",
    balance: -185000,
    older: -185400,
    mortgage: { interestRate: 4.5, monthlyContribution: 1100, termMonths: 300 },
  },
  { name: "Workplace pension", type: "Pension", subtype: null, balance: 48000 },
  { name: "Credit card", type: "Credit Card", subtype: null, balance: -650, older: -820 },
  { name: "Current account", type: "Current", subtype: null, balance: 2400, older: 2100 },
  {
    name: "Stocks and shares ISA",
    type: "Investment",
    subtype: "stocks_and_shares_isa",
    balance: 15500,
  },
  { name: "Easy access savings", type: "Saving", subtype: "easy_access", balance: 8200 },
];

/* ------------------------------------------------------------------------------------------ */
/* Home's households (E12 S5, plan section 9.8)                                                */
/* ------------------------------------------------------------------------------------------ */

/**
 * An account of a household from `apps/e2e/support/personas.ts`, copied here because that module
 * imports Playwright. `fixtures.test.ts` pins every figure to the source. As there, a liability's
 * balance is given positive (the backend stores it negative) and `monthlyChange` is how much the
 * balance grew each month.
 */
export interface PersonaAccount {
  name: string;
  type: AccountWithDetailsDto["type"];
  balance: number;
  monthlyChange: number;
  interestRate?: number;
  monthlyContribution?: number;
  termMonths?: number;
  studentLoanPlan?: "PLAN_2";
}

/** personas.ts `HISTORY_MONTHS`: months of history written before the current month. */
export const PERSONA_HISTORY_MONTHS = 6;

/** personas.ts `RENTER`: age 29, renting, a Plan 2 student loan and one credit card. */
export const RENTER_ACCOUNTS: readonly PersonaAccount[] = [
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
];

/** personas.ts `HOMEOWNER`: age 44, a repayment mortgage, a car loan and a credit card. */
export const HOMEOWNER_ACCOUNTS: readonly PersonaAccount[] = [
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
    name: "Residential mortgage",
    type: "Mortgage",
    balance: 186000,
    interestRate: 4.5,
    termMonths: 218,
    monthlyContribution: 1250,
    monthlyChange: -550,
  },
  {
    name: "Workplace pension",
    type: "Pension",
    balance: 96000,
    interestRate: 5,
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
];

/** The renter's accounts with no debt: the pension pots take the strip's second card (S5b). */
const PENSION_ONLY_ACCOUNTS: readonly PersonaAccount[] = RENTER_ACCOUNTS.filter(
  (a) => a.type !== "Credit Card" && a.type !== "Student Loan",
);

/** A budget row of a persona (personas.ts `SeedBudgetEntry`), copied as the accounts are. */
export interface PersonaBudgetRow {
  name: string;
  category: string;
  amount: number;
  isIncome?: boolean;
  isEssential?: boolean;
}

/** personas.ts `RENTER.budget`. None of it is linked: the income is typed. */
export const RENTER_BUDGET: readonly PersonaBudgetRow[] = [
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
];

/** personas.ts `HOMEOWNER.budget`. */
export const HOMEOWNER_BUDGET: readonly PersonaBudgetRow[] = [
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
];

/** personas.ts `RENTER.profile`'s answers the budget's take-home line is worked out from. */
export const RENTER_FACTS = {
  employmentType: "employed",
  annualSalary: 32000,
  monthlyTakeHome: 2085,
  taxRegion: "ENGLAND",
  studentLoanPlans: ["PLAN_2"],
  housingStatus: "renting",
  monthlyHousingCost: 950,
  pensionPercent: 5,
  isSalarySacrifice: false,
} as const satisfies Partial<UserProfileResponse>;

/** personas.ts `HOMEOWNER.profile`'s answers, as `RENTER_FACTS`. */
export const HOMEOWNER_FACTS = {
  employmentType: "employed",
  annualSalary: 58000,
  monthlyTakeHome: 3450,
  taxRegion: "ENGLAND",
  studentLoanPlans: [],
  housingStatus: "mortgage",
  monthlyHousingCost: 1250,
  pensionPercent: 8,
  isSalarySacrifice: false,
} as const satisfies Partial<UserProfileResponse>;

/**
 * The saved budget as `GET /budget-entries` answers it, parsed with the contract's schema. With
 * `linkTakeHome` the income row is linked to take-home pay: its stored amount is 0 and never read,
 * as the backend stores it, and the engine works the line out from the profile.
 */
export function cannedBudgetEntries(
  userId: string,
  now: Date,
  rows: readonly PersonaBudgetRow[],
  { linkTakeHome = false }: { linkTakeHome?: boolean } = {},
): BudgetEntryListResponse {
  const iso = now.toISOString();
  return BudgetEntryListResponse.parse(
    rows.map((row) => {
      const linked = linkTakeHome && row.isIncome === true;
      return {
        id: randomUUID(),
        userId,
        category: row.category,
        name: row.name,
        amount: linked ? 0 : row.amount,
        frequency: "monthly",
        isIncome: row.isIncome ?? false,
        isPrimaryIncome: row.isIncome ?? false,
        isEssential: row.isEssential ?? false,
        notes: null,
        isDefault: false,
        ownership: "sole",
        sharePercent: null,
        linkKind: linked ? "take_home" : null,
        linkAccountId: null,
        createdAt: iso,
        updatedAt: iso,
      };
    }),
  );
}

const round2 = (n: number) => Math.round(n * 100) / 100;
/** As the backend stores it: a liability negative whatever sign was sent (BE-05). */
const stored = (type: string, value: number) =>
  LIABILITY_TYPES.has(type) ? -Math.abs(value) : value;

/**
 * A persona's store as personas.ts seeds it: today's balances, and the six months before this one
 * recorded through the check-in (`max(0, balance - monthlyChange * monthsBack)`, as `planFor`), the
 * last of them completed. Nothing is recorded this month.
 */
function buildPersonaStore(
  userId: string,
  now: Date,
  seeds: readonly PersonaAccount[],
): CheckInStore {
  const iso = now.toISOString();
  const current = londonMonth(now);
  const accounts = AccountListResponse.parse(
    seeds.map((seed) => ({
      id: randomUUID(),
      name: seed.name,
      type: seed.type,
      accountSubtype: null,
      balance: stored(seed.type, seed.balance),
      interestRate: seed.interestRate ?? null,
      monthlyContribution: seed.monthlyContribution ?? null,
      creditLimit: null,
      promoZeroPercentUntil: null,
      termMonths: seed.termMonths ?? null,
      fixedRateEndDate: null,
      isCurrent: true,
      currency: "GBP",
      studentLoanPlan: seed.studentLoanPlan ?? null,
      ownership: "sole",
      sharePercent: null,
      linkedAccountId: null,
      repaymentType: seed.type === "Mortgage" ? "repayment" : null,
      connectionId: null,
      createdAt: iso,
      updatedAt: iso,
      details: [],
    })),
  );
  let nextDetailId = 1;
  const details: AccountDetailDto[] = [];
  for (let back = PERSONA_HISTORY_MONTHS; back >= 1; back -= 1) {
    const month = addCheckInMonths(current, -back);
    const [year, m] = month.split("-").map(Number) as [number, number];
    accounts.forEach((account, i) => {
      const seed = seeds[i] as PersonaAccount;
      details.push({
        id: nextDetailId++,
        accountId: account.id,
        userId,
        year,
        month: m,
        value: stored(seed.type, round2(Math.max(0, seed.balance - seed.monthlyChange * back))),
        asOfDate: lastDayOfMonth(month),
        source: "manual",
        importBatchId: null,
        updatedAt: iso,
      });
    });
  }
  const previous = addCheckInMonths(current, -1);
  return {
    accounts,
    details: AccountDetailListResponse.parse(details),
    latestStartedMonth: previous,
    latestCompletedMonth: previous,
    nextDetailId,
  };
}

/** The stores the data scenarios read: several Home scenarios share the renter's accounts. */
export type CheckInStoreKind =
  | "ok"
  | "empty"
  | "owner"
  | "renter"
  | "pension-only"
  | "joint"
  | "twoMonths";

/* ------------------------------------------------------------------------------------------ */
/* The accounts screens' households (E12 S6, plan section 9.9)                                  */
/* ------------------------------------------------------------------------------------------ */

/** An account with its balance, the month before and the month before that, as stored. */
interface TwoMonthSeed {
  name: string;
  type: AccountWithDetailsDto["type"];
  subtype: AccountWithDetailsDto["accountSubtype"];
  balance: number;
  previous: number;
  older: number;
  ownership: "sole" | "joint";
  sharePercent: number | null;
}

/**
 * `joint`: a joint 50% mortgage and home, an overdrawn current account and savings (acceptance 6
 * and 7). Today: own 4,000 + half of 310,000 = 159,000; owe 350 overdrawn + half of 186,000 =
 * 93,350; net worth 65,650. `home-data.test.ts` pins every figure.
 */
export const JOINT_ACCOUNTS: readonly TwoMonthSeed[] = [
  {
    name: "Residential mortgage",
    type: "Mortgage",
    subtype: "residential_mortgage",
    balance: -186000,
    previous: -186550,
    older: -187100,
    ownership: "joint",
    sharePercent: 50,
  },
  {
    name: "Home",
    type: "Property",
    subtype: "home",
    balance: 310000,
    previous: 309500,
    older: 309000,
    ownership: "joint",
    sharePercent: 50,
  },
  {
    name: "Current account",
    type: "Current",
    subtype: null,
    balance: -350,
    previous: -200,
    older: 120,
    ownership: "sole",
    sharePercent: null,
  },
  {
    name: "Easy access savings",
    type: "Saving",
    subtype: "easy_access",
    balance: 4000,
    previous: 3900,
    older: 3800,
    ownership: "sole",
    sharePercent: null,
  },
];

/** `twoMonths`: two recorded months only, so history shows its sentence, not a chart. */
export const TWO_MONTH_ACCOUNTS: readonly TwoMonthSeed[] = [
  {
    name: "Current account",
    type: "Current",
    subtype: null,
    balance: 1300,
    previous: 1200,
    older: 1000,
    ownership: "sole",
    sharePercent: null,
  },
  {
    name: "Easy access savings",
    type: "Saving",
    subtype: "easy_access",
    balance: 2150,
    previous: 2100,
    older: 2000,
    ownership: "sole",
    sharePercent: null,
  },
];

/** A store with today's balances and the two months before this one recorded, the last completed. */
function buildTwoMonthStore(
  userId: string,
  now: Date,
  seeds: readonly TwoMonthSeed[],
): CheckInStore {
  const iso = now.toISOString();
  const previous = addCheckInMonths(londonMonth(now), -1);
  const older = addCheckInMonths(londonMonth(now), -2);
  const accounts = AccountListResponse.parse(
    seeds.map((seed) => ({
      id: randomUUID(),
      name: seed.name,
      type: seed.type,
      accountSubtype: seed.subtype,
      balance: seed.balance,
      interestRate: null,
      monthlyContribution: null,
      creditLimit: null,
      promoZeroPercentUntil: null,
      termMonths: null,
      fixedRateEndDate: null,
      isCurrent: true,
      currency: "GBP",
      studentLoanPlan: null,
      ownership: seed.ownership,
      sharePercent: seed.sharePercent,
      linkedAccountId: null,
      repaymentType: seed.type === "Mortgage" ? "repayment" : null,
      connectionId: null,
      createdAt: iso,
      updatedAt: iso,
      details: [],
    })),
  );
  let nextDetailId = 1;
  const details: AccountDetailDto[] = [];
  accounts.forEach((account, i) => {
    const seed = seeds[i] as TwoMonthSeed;
    for (const [month, value] of [
      [older, seed.older],
      [previous, seed.previous],
    ] as const) {
      const [year, m] = month.split("-").map(Number) as [number, number];
      details.push({
        id: nextDetailId++,
        accountId: account.id,
        userId,
        year,
        month: m,
        value,
        asOfDate: lastDayOfMonth(month),
        source: "manual",
        importBatchId: null,
        updatedAt: iso,
      });
    }
  });
  return {
    accounts,
    details: AccountDetailListResponse.parse(details),
    latestStartedMonth: previous,
    latestCompletedMonth: previous,
    nextDetailId,
  };
}

/**
 * A fresh check-in store, every body parsed with its contract schema. `empty` has no accounts,
 * no rows and no check-in months; `owner` and `renter` are the home-owning and renting households
 * of `apps/e2e/support/personas.ts` with six recorded months; `pension-only` is the renter without
 * the credit card and the student loan; `joint` and `twoMonths` are the accounts screens'
 * households (S6). Ids are made at runtime, so each reset has new ones.
 */
export function buildCheckInStore(userId: string, now: Date, kind: CheckInStoreKind): CheckInStore {
  if (kind === "joint") return buildTwoMonthStore(userId, now, JOINT_ACCOUNTS);
  if (kind === "twoMonths") return buildTwoMonthStore(userId, now, TWO_MONTH_ACCOUNTS);
  if (kind === "owner") return buildPersonaStore(userId, now, HOMEOWNER_ACCOUNTS);
  if (kind === "renter") return buildPersonaStore(userId, now, RENTER_ACCOUNTS);
  if (kind === "pension-only") return buildPersonaStore(userId, now, PENSION_ONLY_ACCOUNTS);
  if (kind === "empty") {
    return {
      accounts: [],
      details: [],
      latestStartedMonth: null,
      latestCompletedMonth: null,
      nextDetailId: 1,
    };
  }
  const iso = now.toISOString();
  const previous = addCheckInMonths(londonMonth(now), -1);
  const older = addCheckInMonths(londonMonth(now), -2);
  const accounts = AccountListResponse.parse(
    SEED.map((seed) => ({
      id: randomUUID(),
      name: seed.name,
      type: seed.type,
      accountSubtype: seed.subtype,
      balance: seed.balance,
      interestRate: seed.mortgage?.interestRate ?? null,
      monthlyContribution: seed.mortgage?.monthlyContribution ?? null,
      creditLimit: null,
      promoZeroPercentUntil: null,
      termMonths: seed.mortgage?.termMonths ?? null,
      fixedRateEndDate: null,
      isCurrent: true,
      currency: "GBP",
      studentLoanPlan: null,
      ownership: "sole",
      sharePercent: null,
      linkedAccountId: null,
      repaymentType: seed.mortgage ? "repayment" : null,
      connectionId: null,
      createdAt: iso,
      updatedAt: iso,
      details: [],
    })),
  );
  let nextDetailId = 1;
  const row = (accountId: string, month: string, value: number): AccountDetailDto => {
    const [year, m] = month.split("-").map(Number) as [number, number];
    return {
      id: nextDetailId++,
      accountId,
      userId,
      year,
      month: m,
      value,
      asOfDate: lastDayOfMonth(month),
      source: "manual",
      importBatchId: null,
      updatedAt: iso,
    };
  };
  const details: AccountDetailDto[] = [];
  accounts.forEach((account, i) => {
    const seed = SEED[i] as SeedAccount;
    if (seed.older !== undefined) details.push(row(account.id, older, seed.older));
    details.push(row(account.id, previous, seed.balance));
  });
  return {
    accounts,
    details: AccountDetailListResponse.parse(details),
    latestStartedMonth: previous,
    latestCompletedMonth: previous,
    nextDetailId,
  };
}

/** The engine's check-in steps for a store in the London month of `now` (what the app shows). */
export function checkInStepsFor(store: CheckInStore, now: Date): CheckInStep[] {
  return buildCheckInSteps(store.accounts, store.details, londonMonth(now));
}

export function cannedAccounts(store: CheckInStore): AccountListResponse {
  return AccountListResponse.parse(store.accounts.map((a) => ({ ...a, details: [] })));
}

/**
 * The `malformed` answer: the accounts with the first one's balance taken out after parsing, the
 * one field Home cannot do without, so the app must show that it is out of step.
 */
export function malformedAccounts(store: CheckInStore): unknown[] {
  return cannedAccounts(store).map((a, i) => {
    if (i > 0) return a;
    const { balance: _balance, ...rest } = a;
    return rest;
  });
}

export function cannedAccountDetails(store: CheckInStore): AccountDetailListResponse {
  return AccountDetailListResponse.parse(store.details);
}

export function cannedCheckIns(store: CheckInStore): SnapshotCheckInsResponse {
  return SnapshotCheckInsResponse.parse({
    latestCompletedMonth: store.latestCompletedMonth,
    latestStartedMonth: store.latestStartedMonth,
  });
}

/** Why a snapshot write was refused, in the backend's terms. */
export type SnapshotWriteError =
  | { status: 400; code: "validation_failed"; message: string }
  | { status: 404; code: "not_found"; message: string };

/**
 * Applies `PUT /snapshots/:month` the way the backend does: liabilities stored negative, one row
 * per account and month, the balance moved by a current-month write, and the check-in months
 * moved by `checkIn` and `complete`. Checks everything before changing anything.
 */
export function applySnapshot(
  store: CheckInStore,
  userId: string,
  month: string,
  body: UpsertSnapshotRequest,
  now: Date,
): UpsertSnapshotResponse | SnapshotWriteError {
  const current = londonMonth(now);
  const today = getUkCalendarDate(now);
  const byId = new Map(store.accounts.map((a) => [a.id, a]));
  const seen = new Set<string>();
  for (const v of body.values) {
    const id = v.accountId.toLowerCase();
    if (seen.has(id)) {
      return {
        status: 400,
        code: "validation_failed",
        message: "an account can appear only once per request",
      };
    }
    seen.add(id);
    if (v.asOfDate !== undefined && (v.asOfDate.slice(0, 7) !== month || v.asOfDate > today)) {
      return {
        status: 400,
        code: "validation_failed",
        message: "asOfDate must fall inside the month",
      };
    }
  }
  if ([...seen].some((id) => !byId.has(id))) {
    return { status: 404, code: "not_found", message: "Account not found" };
  }

  const iso = now.toISOString();
  const [year, m] = month.split("-").map(Number) as [number, number];
  const defaultDate = month === current ? today : lastDayOfMonth(month);
  const written = body.values.map((v) => {
    const account = byId.get(v.accountId.toLowerCase()) as AccountWithDetailsDto;
    const value = LIABILITY_TYPES.has(account.type) ? -Math.abs(v.value) : v.value;
    const source = v.source ?? "manual";
    const asOfDate = v.asOfDate ?? defaultDate;
    const existing = store.details.find(
      (d) => d.accountId === account.id && d.year === year && d.month === m,
    );
    if (existing) {
      Object.assign(existing, { value, source, asOfDate, updatedAt: iso });
    } else {
      store.details.push({
        id: store.nextDetailId++,
        accountId: account.id,
        userId,
        year,
        month: m,
        value,
        asOfDate,
        source,
        importBatchId: null,
        updatedAt: iso,
      });
    }
    if (month === current) Object.assign(account, { balance: value, updatedAt: iso });
    return { accountId: account.id, value, asOfDate, source };
  });

  const later = (a: string | null, b: string) =>
    a === null || compareCheckInMonths(b, a) > 0 ? b : a;
  if (body.complete === true) {
    // The backend's started month is the latest check-in row, finished or not.
    store.latestStartedMonth = later(store.latestStartedMonth, month);
    store.latestCompletedMonth = later(store.latestCompletedMonth, month);
  } else if (body.checkIn === true && written.length > 0) {
    store.latestStartedMonth = later(store.latestStartedMonth, month);
  }
  return UpsertSnapshotResponse.parse({
    month,
    values: written,
    completed: body.complete === true,
  });
}
