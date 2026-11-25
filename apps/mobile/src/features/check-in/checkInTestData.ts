/**
 * Tests only: a household for the check-in tests, every body parsed with its contract schema. Ids
 * are made at runtime. The clock is fixed at 20 November 2026 (London), so the check-in month is
 * 2026-11, history is in September and October, and nothing is recorded in November yet.
 */
import { randomUUID } from "node:crypto";
import {
  AccountDetailListResponse,
  AccountListResponse,
  SnapshotCheckInsResponse,
  UpsertSnapshotRequest,
  UserProfileResponse,
} from "@flump/api-contract";
import { type FakeRoute, fail } from "../../data/fakeApi";

export const NOW = () => new Date("2026-11-20T12:00:00Z");
export const MONTH = "2026-11";

type AccountType = AccountListResponse[number]["type"];

interface Seed {
  name: string;
  type: AccountType;
  balance: number;
  oct?: number;
  sep?: number;
  interestRate?: number;
  monthlyContribution?: number;
}

/** Saved order, which is not the check-in's order, so the engine's sort shows. */
export const SEEDS: readonly Seed[] = [
  {
    name: "Mortgage",
    type: "Mortgage",
    balance: -185000,
    oct: -185000,
    sep: -185400,
    interestRate: 4.5,
    monthlyContribution: 1100,
  },
  { name: "Workplace pension", type: "Pension", balance: 48000, oct: 48000 },
  { name: "Credit card", type: "Credit Card", balance: -650, oct: -650 },
  { name: "Current account", type: "Current", balance: 1204, oct: 1204, sep: 1100 },
  { name: "Stocks and shares ISA", type: "Investment", balance: 15500, oct: 15500 },
  { name: "Easy access savings", type: "Saving", balance: 8200, oct: 8200 },
];

export interface Household {
  accounts: AccountListResponse;
  details: AccountDetailListResponse;
  checkIns: SnapshotCheckInsResponse;
  profile: UserProfileResponse;
  idOf(name: string): string;
}

export function household(
  seeds: readonly Seed[] = SEEDS,
  checkIns: SnapshotCheckInsResponse = {
    latestCompletedMonth: "2026-10",
    latestStartedMonth: "2026-10",
  },
): Household {
  const iso = NOW().toISOString();
  const userId = `user_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
  const accounts = AccountListResponse.parse(
    seeds.map((s) => ({
      id: randomUUID(),
      name: s.name,
      type: s.type,
      balance: s.balance,
      interestRate: s.interestRate ?? null,
      monthlyContribution: s.monthlyContribution ?? null,
      termMonths: null,
      fixedRateEndDate: null,
      isCurrent: true,
      currency: "GBP",
      studentLoanPlan: null,
      ownership: "sole",
      sharePercent: null,
      connectionId: null,
      createdAt: iso,
      updatedAt: iso,
      details: [],
    })),
  );
  let id = 1;
  const details = AccountDetailListResponse.parse(
    accounts.flatMap((a, i) => {
      const s = seeds[i] as Seed;
      const rows = [];
      for (const [month, value] of [
        [9, s.sep],
        [10, s.oct],
      ] as const) {
        if (value === undefined) continue;
        rows.push({
          id: id++,
          accountId: a.id,
          userId,
          year: 2026,
          month,
          value,
          asOfDate: `2026-${String(month).padStart(2, "0")}-28`,
          source: "manual",
          importBatchId: null,
          updatedAt: iso,
        });
      }
      return rows;
    }),
  );
  const profile = UserProfileResponse.parse({
    id: randomUUID(),
    userId,
    email: "sam.taylor@example.com",
    firstName: "Sam",
    lastName: "Taylor",
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
    createdAt: iso,
    updatedAt: iso,
  });
  const byName = new Map(accounts.map((a) => [a.name, a.id.toLowerCase()]));
  return {
    accounts,
    details,
    checkIns: SnapshotCheckInsResponse.parse(checkIns),
    profile,
    idOf: (name) => byName.get(name) ?? "",
  };
}

/**
 * The four reads and the save, as the backend answers them. A save is checked against the
 * contract's request schema here too, and answers as the backend does (debts stored negative).
 */
export function routes(h: Household, overrides: Record<string, FakeRoute> = {}) {
  const base: Record<string, FakeRoute> = {
    "GET /accounts": () => h.accounts,
    "GET /account-details": () => h.details,
    "GET /user-profile": () => h.profile,
    "GET /snapshots/check-ins": () => h.checkIns,
    [`PUT /snapshots/${MONTH}`]: (body) => {
      const parsed = UpsertSnapshotRequest.safeParse(body);
      if (!parsed.success) fail("client", 400, "validation_failed");
      return {
        month: MONTH,
        values: parsed.data.values.map((v) => ({
          accountId: v.accountId,
          value: v.value,
          asOfDate: "2026-11-20",
          source: v.source ?? "manual",
        })),
        completed: parsed.data.complete === true,
      };
    },
  };
  return { ...base, ...overrides };
}
