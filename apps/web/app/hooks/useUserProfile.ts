import {
  ResetFinancialDataResponse,
  SendPasswordResetResponse,
  UpdateChecklistResponse,
  UpdateProfileResponse,
} from "@flump/api-contract";
import { type FinancialBaseline, userProfileToFinancialBaseline } from "@flump/finance-engine";
import { atom, useAtom } from "jotai";
import { useCallback } from "react";
import { apiFetch } from "~/services/api-client";
import { BackendError } from "~/services/backend-error";
import { financialBaselineAtom } from "~/state/baseline.store";
import { stripRetiredKeys, stripRetiredRecordKeys } from "~/utils/pageConfig";

/** E23 D06: the four UK nations as stored on the profile; null means not set. */
export type TaxRegion = "ENGLAND" | "WALES" | "SCOTLAND" | "NORTHERN_IRELAND";

// Nullable fields are optional (`?:`) so a contract-parsed profile assigns: with this app's
// `strictNullChecks: false`, zod types a nullable key as optional (BE-10).
export interface UserProfile {
  id: string;
  userId: string;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  currency: string;
  country: string;
  age?: number | null;
  birthYear?: number | null;
  taxRegion?: TaxRegion | null;
  /** [] means "no student loan"; null means not answered. */
  studentLoanPlans?: string[] | null;
  employmentType?: "employed" | "self-employed" | "other" | null;
  annualSalary?: number | null;
  monthlyTakeHome?: number | null;
  studentLoanPlan?: string | null;
  hasSecondIncome: boolean;
  secondIncomeMonthly?: number | null;
  hasRentalIncome: boolean;
  rentalIncomeMonthly?: number | null;
  housingStatus?: "renting" | "mortgage" | "own_outright" | "living_with_family" | null;
  monthlyHousingCost?: number | null;
  monthlyOtherOutgoings?: number | null;
  totalCashSavings?: number | null;
  totalPensionPot?: number | null;
  totalUnsecuredDebt?: number | null;
  hasMortgage: boolean;
  mortgageType: "repayment" | "interest-only";
  mortgageRenewalDate?: string | null;
  homeValue?: number | null;
  mortgageBalance?: number | null;
  propertyOwnershipShare: number;
  hasBuyToLet: boolean;
  buyToLetCount: number;
  buyToLetPropertyValue?: number | null;
  buyToLetMonthlyRental?: number | null;
  buyToLetMortgageBalance?: number | null;
  buyToLetMortgageRate?: number | null;
  buyToLetMortgageType: "repayment" | "interest-only";
  pensionPercent: number;
  pensionEmployerPercent: number;
  isSalarySacrifice: boolean;
  isSalarySacrificeEmployerNi: boolean;
  monthlySavingsTarget?: number | null;
  savingsAllocationMode: "total" | "per_account";
  savingsDefaultInterestRate: number;
  setupChecklistCompletedSteps: string[];
  enabledPages: string[];
  dashboardWidgets: string[];
  dashboardWidgetOrder: string[];
  dashboardWidgetSizes: Record<string, "normal" | "wide">;
  dashboardWidgetConfig: Record<string, any>;
  customBudgetCategories?: string[];
  hasResetFinancialData?: boolean;
  onboardingCompleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type UserProfileUpdate = Partial<
  Omit<UserProfile, "id" | "userId" | "createdAt" | "updatedAt">
>;

export const DEFAULT_PROFILE: UserProfile = {
  id: "",
  userId: "",
  displayName: null,
  firstName: null,
  lastName: null,
  email: null,
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
  mortgageType: "repayment",
  propertyOwnershipShare: 100.0,
  hasBuyToLet: false,
  buyToLetCount: 1,
  buyToLetPropertyValue: null,
  buyToLetMonthlyRental: null,
  buyToLetMortgageBalance: null,
  buyToLetMortgageRate: null,
  buyToLetMortgageType: "interest-only",
  pensionPercent: 5.0,
  pensionEmployerPercent: 3.0,
  isSalarySacrifice: false,
  isSalarySacrificeEmployerNi: false,
  monthlySavingsTarget: null,
  savingsAllocationMode: "per_account",
  savingsDefaultInterestRate: 5.0,
  setupChecklistCompletedSteps: [],
  enabledPages: ["accounts", "budget", "debt", "savings", "pension", "mortgage"],
  dashboardWidgets: ["accounts", "budget", "debt", "savings", "pension", "mortgage"],
  dashboardWidgetOrder: ["accounts", "budget", "debt", "savings", "pension", "mortgage"],
  dashboardWidgetSizes: { accounts: "wide", debt: "wide" },
  dashboardWidgetConfig: {},
  customBudgetCategories: [],
  hasResetFinancialData: false,
  onboardingCompleted: false,
  createdAt: "",
  updatedAt: "",
};

/** Falls back when stripping retired keys left a record empty (or it was never set). */
function nonEmptyOr<V>(record: Record<string, V> | undefined, fallback: Record<string, V>) {
  return record && Object.keys(record).length > 0 ? record : fallback;
}

export const normalizeProfile = (p: Partial<UserProfile>): UserProfile => ({
  ...DEFAULT_PROFILE,
  ...p,
  firstName: p.firstName !== undefined ? p.firstName : DEFAULT_PROFILE.firstName,
  lastName: p.lastName !== undefined ? p.lastName : DEFAULT_PROFILE.lastName,
  email: p.email !== undefined ? p.email : DEFAULT_PROFILE.email,
  hasResetFinancialData: Boolean(p.hasResetFinancialData),
  onboardingCompleted: Boolean(p.onboardingCompleted),
  avatarUrl: p.avatarUrl !== undefined ? p.avatarUrl : DEFAULT_PROFILE.avatarUrl,
  age: p.age !== undefined && p.age !== null ? Number(p.age) : null,
  studentLoanPlan: p.studentLoanPlan !== undefined ? p.studentLoanPlan : null,
  birthYear: p.birthYear !== undefined && p.birthYear !== null ? Number(p.birthYear) : null,
  taxRegion: p.taxRegion ?? null,
  studentLoanPlans: Array.isArray(p.studentLoanPlans) ? p.studentLoanPlans : null,
  housingStatus: p.housingStatus !== undefined ? p.housingStatus : null,
  monthlyHousingCost:
    p.monthlyHousingCost !== undefined && p.monthlyHousingCost !== null
      ? Number(p.monthlyHousingCost)
      : null,
  monthlyOtherOutgoings:
    p.monthlyOtherOutgoings !== undefined && p.monthlyOtherOutgoings !== null
      ? Number(p.monthlyOtherOutgoings)
      : null,
  totalCashSavings:
    p.totalCashSavings !== undefined && p.totalCashSavings !== null
      ? Number(p.totalCashSavings)
      : null,
  totalPensionPot:
    p.totalPensionPot !== undefined && p.totalPensionPot !== null
      ? Number(p.totalPensionPot)
      : null,
  totalUnsecuredDebt:
    p.totalUnsecuredDebt !== undefined && p.totalUnsecuredDebt !== null
      ? Number(p.totalUnsecuredDebt)
      : null,
  homeValue: p.homeValue !== undefined && p.homeValue !== null ? Number(p.homeValue) : null,
  mortgageBalance:
    p.mortgageBalance !== undefined && p.mortgageBalance !== null
      ? Number(p.mortgageBalance)
      : null,
  annualSalary:
    p.annualSalary !== null && p.annualSalary !== undefined ? Number(p.annualSalary) : null,
  monthlyTakeHome:
    p.monthlyTakeHome !== null && p.monthlyTakeHome !== undefined
      ? Number(p.monthlyTakeHome)
      : null,
  secondIncomeMonthly:
    p.secondIncomeMonthly !== null && p.secondIncomeMonthly !== undefined
      ? Number(p.secondIncomeMonthly)
      : null,
  rentalIncomeMonthly:
    p.rentalIncomeMonthly !== null && p.rentalIncomeMonthly !== undefined
      ? Number(p.rentalIncomeMonthly)
      : null,
  propertyOwnershipShare:
    p.propertyOwnershipShare !== null && p.propertyOwnershipShare !== undefined
      ? Number(p.propertyOwnershipShare)
      : 100.0,
  mortgageType: p.mortgageType || DEFAULT_PROFILE.mortgageType,
  hasBuyToLet: p.hasBuyToLet !== undefined ? Boolean(p.hasBuyToLet) : false,
  buyToLetCount:
    p.buyToLetCount !== null && p.buyToLetCount !== undefined ? Number(p.buyToLetCount) : 1,
  buyToLetPropertyValue:
    p.buyToLetPropertyValue !== null && p.buyToLetPropertyValue !== undefined
      ? Number(p.buyToLetPropertyValue)
      : null,
  buyToLetMonthlyRental:
    p.buyToLetMonthlyRental !== null && p.buyToLetMonthlyRental !== undefined
      ? Number(p.buyToLetMonthlyRental)
      : null,
  buyToLetMortgageBalance:
    p.buyToLetMortgageBalance !== null && p.buyToLetMortgageBalance !== undefined
      ? Number(p.buyToLetMortgageBalance)
      : null,
  buyToLetMortgageRate:
    p.buyToLetMortgageRate !== null && p.buyToLetMortgageRate !== undefined
      ? Number(p.buyToLetMortgageRate)
      : null,
  buyToLetMortgageType: p.buyToLetMortgageType || DEFAULT_PROFILE.buyToLetMortgageType,
  pensionPercent:
    p.pensionPercent !== null && p.pensionPercent !== undefined ? Number(p.pensionPercent) : 5.0,
  pensionEmployerPercent:
    p.pensionEmployerPercent !== null && p.pensionEmployerPercent !== undefined
      ? Number(p.pensionEmployerPercent)
      : 3.0,
  // Never assume salary sacrifice the user did not choose: net pay, as the dashboard and budget use.
  isSalarySacrifice: p.isSalarySacrifice !== undefined ? Boolean(p.isSalarySacrifice) : false,
  isSalarySacrificeEmployerNi:
    p.isSalarySacrificeEmployerNi !== undefined ? Boolean(p.isSalarySacrificeEmployerNi) : false,
  monthlySavingsTarget:
    p.monthlySavingsTarget !== null && p.monthlySavingsTarget !== undefined
      ? Number(p.monthlySavingsTarget)
      : null,
  savingsDefaultInterestRate:
    p.savingsDefaultInterestRate !== null && p.savingsDefaultInterestRate !== undefined
      ? Number(p.savingsDefaultInterestRate)
      : 5.0,
  // Retired module keys (`forecast`) are dropped on every read; the stored value is rewritten the
  // next time the user saves, so no destructive migration is needed.
  enabledPages: Array.isArray(p.enabledPages)
    ? stripRetiredKeys(p.enabledPages)
    : DEFAULT_PROFILE.enabledPages,
  dashboardWidgets: Array.isArray(p.dashboardWidgets)
    ? stripRetiredKeys(p.dashboardWidgets)
    : DEFAULT_PROFILE.dashboardWidgets,
  dashboardWidgetOrder: Array.isArray(p.dashboardWidgetOrder)
    ? stripRetiredKeys(p.dashboardWidgetOrder)
    : DEFAULT_PROFILE.dashboardWidgetOrder,
  dashboardWidgetSizes: nonEmptyOr(
    stripRetiredRecordKeys(p.dashboardWidgetSizes),
    DEFAULT_PROFILE.dashboardWidgetSizes,
  ),
  dashboardWidgetConfig:
    stripRetiredRecordKeys(p.dashboardWidgetConfig) || DEFAULT_PROFILE.dashboardWidgetConfig,
});

export const userProfileAtom = atom<UserProfile>(DEFAULT_PROFILE);

/**
 * Hook to access and update the global user profile.
 * The profile is fetched once via the loader and set into the atom.
 * Components can read and mutate profile data through this hook.
 */
function messageFrom(err: unknown, fallback: string): Error {
  // Only server-supplied detail or the fixed fallback reaches the UI, never a raw "Failed to fetch".
  if (err instanceof BackendError) return new Error(err.detail ?? fallback);
  return new Error(fallback);
}

/**
 * Profile to client baseline. The engine mapper fills a missing salary with its 45,000 default;
 * the web baseline must carry no salary instead (0 = unknown, rendered as "Not set").
 */
export function profileToBaseline(profile: UserProfile | Partial<UserProfile>): FinancialBaseline {
  const baseline = userProfileToFinancialBaseline(profile);
  const salary = profile.annualSalary;
  return salary === null || salary === undefined || Number(salary) <= 0
    ? { ...baseline, annualGrossSalary: 0 }
    : baseline;
}

/**
 * The phrase typed to confirm a financial data reset. Must equal RESET_FINANCIAL_DATA_CONFIRMATION
 * in @flump/api-contract: the backend rejects the reset without it.
 */
export const RESET_FINANCIAL_DATA_CONFIRMATION = "RESET";

/**
 * Thrown by resetFinancialData when the backend wants a recent sign-in first (BE-04: 403 with
 * `error: "recent_login_required"`; the `/api` proxy passes the 403 on without the body, and it
 * is the only 403 that owner-scoped route sends).
 */
export class RecentLoginRequiredError extends Error {
  constructor() {
    super("A recent sign-in is required");
    this.name = "RecentLoginRequiredError";
  }
}

export function useUserProfile() {
  const [profile, rawSetProfile] = useAtom(userProfileAtom);
  const [, rawSetBaseline] = useAtom(financialBaselineAtom);
  const setProfile = useCallback(
    (p: UserProfile | Partial<UserProfile>) => {
      const normalized = normalizeProfile(p);
      rawSetProfile(normalized);
      try {
        rawSetBaseline(profileToBaseline(normalized));
      } catch {
        // Continue
      }
    },
    [rawSetProfile, rawSetBaseline],
  );

  const updateProfile = useCallback(
    async (updates: UserProfileUpdate): Promise<void> => {
      const updated: UserProfile = await apiFetch("/user-profile", {
        method: "PATCH",
        body: updates,
        schema: UpdateProfileResponse,
      });
      setProfile(updated);
    },
    [setProfile],
  );

  const markChecklistStep = useCallback(
    async (step: string, completed: boolean): Promise<void> => {
      const updated: UserProfile = await apiFetch("/user-profile/checklist", {
        method: "PATCH",
        body: { step, completed },
        schema: UpdateChecklistResponse,
      });
      setProfile(updated);
    },
    [setProfile],
  );

  const sendPasswordResetEmail = useCallback(async (): Promise<{
    success: boolean;
    message?: string;
  }> => {
    try {
      // The server resolves the caller's own email; no body is sent.
      return await apiFetch("/user-profile/send-password-reset", {
        method: "POST",
        schema: SendPasswordResetResponse,
      });
    } catch (err) {
      throw messageFrom(err, "We could not send the password reset email. Try again.");
    }
  }, []);

  const resetFinancialData = useCallback(async (): Promise<void> => {
    let result: { profile?: UserProfile } | undefined;
    try {
      // The backend requires the typed phrase too (security review), not only the dialog.
      result = await apiFetch("/user-profile/reset-financial-data", {
        method: "POST",
        schema: ResetFinancialDataResponse,
        body: { confirmation: RESET_FINANCIAL_DATA_CONFIRMATION },
      });
    } catch (err) {
      if (err instanceof BackendError && err.status === 403) throw new RecentLoginRequiredError();
      throw messageFrom(err, "We could not reset your financial data. Try again.");
    }
    if (result?.profile) {
      setProfile(result.profile);
    }
  }, [setProfile]);

  return {
    profile,
    setProfile,
    updateProfile,
    markChecklistStep,
    sendPasswordResetEmail,
    resetFinancialData,
  };
}
