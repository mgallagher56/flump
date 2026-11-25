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

export function cannedProfile(userId: string, now: Date): UserProfileResponse {
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
    studentLoanPlans: null,
    housingStatus: null,
    monthlyHousingCost: null,
    monthlyOtherOutgoings: null,
    netWorthCountsProperty: true,
    netWorthCountsStudentLoan: false,
    partnerMode: false,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
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

/**
 * A fresh check-in store, every body parsed with its contract schema. `empty` has no accounts,
 * no rows and no check-in months. Ids are made at runtime, so each reset has new ones.
 */
export function buildCheckInStore(userId: string, now: Date, kind: "ok" | "empty"): CheckInStore {
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
