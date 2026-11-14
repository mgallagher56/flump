import { type UpdateProfileRequest } from "@flump/api-contract";
import { BadRequestException } from "@nestjs/common";
import {
  STUDENT_LOAN_PLANS,
  type StudentLoanPlan,
  UserProfile,
} from "../../entities/user-profile.entity";
import { type RemovedCounts } from "../privacy/user-data-registry";

/** Profile formatting, field validation and update defaults behind UserProfileService. */
export const PG_UNIQUE_VIOLATION = "23505";

/** TypeORM wraps the pg error: QueryFailedError.driverError.code. Also accept a bare err.code. */
export function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: unknown; driverError?: { code?: unknown } } | null | undefined;
  return e?.code === PG_UNIQUE_VIOLATION || e?.driverError?.code === PG_UNIQUE_VIOLATION;
}

/**
 * Module keys retired from the product. `forecast` was a dashboard module until the growth
 * forecaster became a tab in Savings. Stored rows may still carry it; it is filtered out on read
 * (non-destructive: the row is rewritten the next time the user saves).
 */
export const RETIRED_MODULE_KEYS: readonly string[] = ["forecast"];

export function withoutRetiredModules(keys: string[]): string[] {
  return keys.filter((k) => !RETIRED_MODULE_KEYS.includes(k));
}

export function withoutRetiredModuleKeys<V>(record: Record<string, V> | null | undefined) {
  if (!record) return record;
  return Object.fromEntries(
    Object.entries(record).filter(([k]) => !RETIRED_MODULE_KEYS.includes(k)),
  ) as Record<string, V>;
}

export function nonEmptyRecord<V>(record: Record<string, V> | null | undefined) {
  return record && Object.keys(record).length > 0 ? record : undefined;
}

// E23 profile facts: validated here so a bad value is a 400, never a CHECK-violation 500.
export function oneOfOrNull<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): T | null {
  if (value === null) return null;
  if (typeof value === "string" && (allowed as readonly string[]).includes(value))
    return value as T;
  throw new BadRequestException(`${field} must be one of ${allowed.join(", ")} or null`);
}

export function birthYearOrNull(value: unknown): number | null {
  if (value === null) return null;
  const thisYear = new Date().getUTCFullYear();
  if (typeof value === "number" && Number.isInteger(value) && value >= 1900 && value <= thisYear) {
    return value;
  }
  throw new BadRequestException(`birthYear must be a whole year from 1900 to ${thisYear} or null`);
}

export function studentLoanPlansOrNull(value: unknown): StudentLoanPlan[] | null {
  if (value === null) return null;
  if (!Array.isArray(value)) {
    throw new BadRequestException("studentLoanPlans must be an array or null");
  }
  const plans = value.map((plan) => oneOfOrNull(plan, STUDENT_LOAN_PLANS, "studentLoanPlans[]"));
  return [...new Set(plans.filter((plan): plan is StudentLoanPlan => plan !== null))];
}

export function moneyOrNull(value: unknown, field: string): number | null {
  if (value === null) return null;
  if (typeof value === "number" && Number.isFinite(value) && value >= 0 && value < 1e10) {
    return Math.round(value * 100) / 100;
  }
  throw new BadRequestException(`${field} must be a non-negative amount or null`);
}

/** The profile row as it goes on the wire (E21 contract): every key present, decimals as numbers. */
export function formatProfileRow(profile: UserProfile) {
  // last_active_at is retention bookkeeping (BE-06), not part of the profile contract.
  const { lastActiveAt: _lastActiveAt, ...rest } = profile;
  return {
    ...rest,
    // Nullable columns with no DB default are absent from a just-inserted entity; pin them to
    // null so every response has the same keys (E21 contract).
    displayName: profile.displayName ?? null,
    avatarUrl: profile.avatarUrl ?? null,
    employmentType: profile.employmentType ?? null,
    firstName: profile.firstName ?? null,
    lastName: profile.lastName ?? null,
    taxRegion: profile.taxRegion ?? null,
    birthYear: profile.birthYear ?? null,
    studentLoanPlans: profile.studentLoanPlans ?? null,
    housingStatus: profile.housingStatus ?? null,
    monthlyHousingCost: profile.monthlyHousingCost ?? null,
    monthlyOtherOutgoings: profile.monthlyOtherOutgoings ?? null,
    // Net worth choices: the column defaults, so a just-inserted entity shows the same values.
    netWorthCountsProperty: profile.netWorthCountsProperty ?? true,
    netWorthCountsStudentLoan: profile.netWorthCountsStudentLoan ?? false,
    annualSalary:
      profile.annualSalary !== null && profile.annualSalary !== undefined
        ? Number(profile.annualSalary)
        : null,
    monthlyTakeHome:
      profile.monthlyTakeHome !== null && profile.monthlyTakeHome !== undefined
        ? Number(profile.monthlyTakeHome)
        : null,
    hasResetFinancialData: Boolean(profile.hasResetFinancialData),
    onboardingCompleted: Boolean(profile.onboardingCompleted),
    propertyOwnershipShare:
      profile.propertyOwnershipShare !== null && profile.propertyOwnershipShare !== undefined
        ? Number(profile.propertyOwnershipShare)
        : 100.0,
    secondIncomeMonthly:
      profile.secondIncomeMonthly !== null && profile.secondIncomeMonthly !== undefined
        ? Number(profile.secondIncomeMonthly)
        : null,
    rentalIncomeMonthly:
      profile.rentalIncomeMonthly !== null && profile.rentalIncomeMonthly !== undefined
        ? Number(profile.rentalIncomeMonthly)
        : null,
    buyToLetPropertyValue:
      profile.buyToLetPropertyValue !== null && profile.buyToLetPropertyValue !== undefined
        ? Number(profile.buyToLetPropertyValue)
        : null,
    buyToLetMonthlyRental:
      profile.buyToLetMonthlyRental !== null && profile.buyToLetMonthlyRental !== undefined
        ? Number(profile.buyToLetMonthlyRental)
        : null,
    buyToLetMortgageBalance:
      profile.buyToLetMortgageBalance !== null && profile.buyToLetMortgageBalance !== undefined
        ? Number(profile.buyToLetMortgageBalance)
        : null,
    buyToLetMortgageRate:
      profile.buyToLetMortgageRate !== null && profile.buyToLetMortgageRate !== undefined
        ? Number(profile.buyToLetMortgageRate)
        : null,
    buyToLetMortgageType: profile.buyToLetMortgageType || "interest-only",
    pensionPercent:
      profile.pensionPercent !== null && profile.pensionPercent !== undefined
        ? Number(profile.pensionPercent)
        : profile.hasResetFinancialData
          ? 0
          : 5.0,
    pensionEmployerPercent:
      profile.pensionEmployerPercent !== null && profile.pensionEmployerPercent !== undefined
        ? Number(profile.pensionEmployerPercent)
        : profile.hasResetFinancialData
          ? 0
          : 3.0,
    isSalarySacrifice:
      profile.isSalarySacrifice !== null && profile.isSalarySacrifice !== undefined
        ? profile.hasResetFinancialData && Number(profile.pensionPercent) === 0
          ? false
          : Boolean(profile.isSalarySacrifice)
        : false,
    isSalarySacrificeEmployerNi:
      profile.isSalarySacrificeEmployerNi !== null &&
      profile.isSalarySacrificeEmployerNi !== undefined
        ? profile.hasResetFinancialData && Number(profile.pensionPercent) === 0
          ? false
          : Boolean(profile.isSalarySacrificeEmployerNi)
        : false,
    monthlySavingsTarget:
      profile.monthlySavingsTarget !== null && profile.monthlySavingsTarget !== undefined
        ? Number(profile.monthlySavingsTarget)
        : null,
    savingsDefaultInterestRate:
      profile.savingsDefaultInterestRate !== null &&
      profile.savingsDefaultInterestRate !== undefined
        ? Number(profile.savingsDefaultInterestRate)
        : 5.0,
    savingsAllocationMode: profile.savingsAllocationMode || "per_account",
    setupChecklistCompletedSteps: Array.isArray(profile.setupChecklistCompletedSteps)
      ? profile.setupChecklistCompletedSteps
      : [],
    enabledPages: Array.isArray(profile.enabledPages)
      ? withoutRetiredModules(profile.enabledPages)
      : ["accounts", "budget", "savings", "pension", "mortgage"],
    dashboardWidgets: Array.isArray(profile.dashboardWidgets)
      ? withoutRetiredModules(profile.dashboardWidgets)
      : ["accounts", "budget", "savings", "pension", "mortgage"],
    dashboardWidgetOrder: Array.isArray(profile.dashboardWidgetOrder)
      ? withoutRetiredModules(profile.dashboardWidgetOrder)
      : ["accounts", "budget", "savings", "pension", "mortgage"],
    dashboardWidgetSizes: nonEmptyRecord(
      withoutRetiredModuleKeys(profile.dashboardWidgetSizes),
    ) || {
      accounts: "wide",
    },
    dashboardWidgetConfig: withoutRetiredModuleKeys(profile.dashboardWidgetConfig) || {},
    customBudgetCategories: Array.isArray(profile.customBudgetCategories)
      ? profile.customBudgetCategories
      : [],
  };
}

export type FormattedProfile = ReturnType<typeof formatProfileRow>;

/** GET /user-profile and every write that returns the profile: the row plus the caller's email. */
export type ProfileView = FormattedProfile & { email: string | null };

export interface ResetFinancialDataResult {
  success: true;
  message: string;
  profile: ProfileView;
}

export interface ProfileLifecycle {
  getProfile(userId: string, email?: string): Promise<ProfileView>;
  updateProfile(userId: string, body: UpdateProfileRequest, email?: string): Promise<ProfileView>;
  resetFinancialData(userId: string, email?: string): Promise<ResetFinancialDataResult>;
  sendPasswordReset(userId: string): Promise<{ success: true }>;
  updateChecklist(
    userId: string,
    step: string,
    completed: boolean,
    email?: string,
  ): Promise<ProfileView>;
}

/** Rows removed by a financial data reset, per registry table (counts only, for the audit event). */
export type FinancialDataResetCounts = RemovedCounts;

/**
 * Sets every financial field of the profile back to its default (M-PRIV1). Kept: identity (names,
 * avatar), locale (currency, country), layout preferences (pages, widgets) and the net worth
 * choices (what net worth counts is a preference, not financial data).
 */
export function clearFinancialProfileFields(profile: UserProfile): void {
  profile.employmentType = null;
  profile.annualSalary = null;
  profile.monthlyTakeHome = null;
  profile.hasSecondIncome = false;
  profile.secondIncomeMonthly = null;
  profile.hasRentalIncome = false;
  profile.rentalIncomeMonthly = null;
  profile.hasMortgage = false;
  profile.mortgageType = "repayment";
  profile.propertyOwnershipShare = 100.0;
  profile.hasBuyToLet = false;
  profile.buyToLetCount = 1;
  profile.buyToLetPropertyValue = null;
  profile.buyToLetMonthlyRental = null;
  profile.buyToLetMortgageBalance = null;
  profile.buyToLetMortgageRate = null;
  profile.buyToLetMortgageType = "interest-only";
  profile.pensionPercent = 0;
  profile.pensionEmployerPercent = 0;
  profile.isSalarySacrifice = false;
  profile.isSalarySacrificeEmployerNi = false;
  profile.customBudgetCategories = [];
  profile.monthlySavingsTarget = null;
  profile.savingsAllocationMode = "per_account";
  profile.savingsDefaultInterestRate = 5.0;
  profile.taxRegion = null;
  profile.birthYear = null;
  profile.studentLoanPlans = null;
  profile.housingStatus = null;
  profile.monthlyHousingCost = null;
  profile.monthlyOtherOutgoings = null;
  profile.setupChecklistCompletedSteps = [];
  profile.hasResetFinancialData = true;
  profile.onboardingCompleted = false;
}

/** The empty defaults a profile row is created with when an update arrives before any read. */
export const PROFILE_UPDATE_DEFAULTS = (userId: string): Partial<UserProfile> => ({
  userId,
  displayName: null,
  firstName: null,
  lastName: null,
  avatarUrl: null,
  currency: "GBP",
  country: "GB",
  employmentType: null,
  annualSalary: null,
  monthlyTakeHome: null,
  hasSecondIncome: false,
  secondIncomeMonthly: null,
  hasRentalIncome: false,
  rentalIncomeMonthly: null,
  hasMortgage: false,
  propertyOwnershipShare: 100.0,
  pensionPercent: 5.0,
  pensionEmployerPercent: 3.0,
  isSalarySacrifice: false,
  isSalarySacrificeEmployerNi: false,
  monthlySavingsTarget: null,
  savingsAllocationMode: "per_account",
  savingsDefaultInterestRate: 5.0,
  setupChecklistCompletedSteps: [],
  onboardingCompleted: false,
  netWorthCountsProperty: true,
  netWorthCountsStudentLoan: false,
});
