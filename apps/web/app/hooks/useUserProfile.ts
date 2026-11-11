import {
  clearOnboardingSeed,
  type FinancialBaseline,
  financialBaselineToUserProfileUpdate,
  type OnboardingSeedPayload,
  type ProfilePersistenceAdapter,
  persistOnboardingSeed,
  readOnboardingSeed,
  userProfileToFinancialBaseline,
} from "@flump/finance-engine";
import { atom, useAtom } from "jotai";
import { useCallback } from "react";
import { useRouteLoaderData } from "react-router";
import { apiFetch } from "~/services/api-client";
import { BackendError } from "~/services/backend-error";
import { financialBaselineAtom } from "~/state/baseline.store";

export interface UserProfile {
  id: string;
  userId: string;
  displayName: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  avatarUrl: string | null;
  currency: string;
  country: string;
  age?: number | null;
  employmentType: "employed" | "self-employed" | "other" | null;
  annualSalary: number | null;
  monthlyTakeHome: number | null;
  studentLoanPlan?: string | null;
  hasSecondIncome: boolean;
  secondIncomeMonthly: number | null;
  hasRentalIncome: boolean;
  rentalIncomeMonthly: number | null;
  housingStatus?: "renting" | "mortgage" | "own_outright" | null;
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
  buyToLetPropertyValue: number | null;
  buyToLetMonthlyRental: number | null;
  buyToLetMortgageBalance: number | null;
  buyToLetMortgageRate: number | null;
  buyToLetMortgageType: "repayment" | "interest-only";
  pensionPercent: number;
  pensionEmployerPercent: number;
  isSalarySacrifice: boolean;
  isSalarySacrificeEmployerNi: boolean;
  monthlySavingsTarget: number | null;
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
  isSalarySacrifice: true,
  isSalarySacrificeEmployerNi: false,
  monthlySavingsTarget: null,
  savingsAllocationMode: "per_account",
  savingsDefaultInterestRate: 5.0,
  setupChecklistCompletedSteps: [],
  enabledPages: ["accounts", "budget", "debt", "savings", "pension", "mortgage", "forecast", "tax"],
  dashboardWidgets: [
    "accounts",
    "budget",
    "debt",
    "savings",
    "pension",
    "mortgage",
    "forecast",
    "tax",
  ],
  dashboardWidgetOrder: [
    "accounts",
    "budget",
    "debt",
    "savings",
    "pension",
    "mortgage",
    "forecast",
    "tax",
  ],
  dashboardWidgetSizes: { accounts: "wide", debt: "wide" },
  dashboardWidgetConfig: {},
  customBudgetCategories: [],
  hasResetFinancialData: false,
  onboardingCompleted: false,
  createdAt: "",
  updatedAt: "",
};

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
  isSalarySacrifice: p.isSalarySacrifice !== undefined ? Boolean(p.isSalarySacrifice) : true,
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
  enabledPages: Array.isArray(p.enabledPages) ? p.enabledPages : DEFAULT_PROFILE.enabledPages,
  dashboardWidgets: Array.isArray(p.dashboardWidgets)
    ? p.dashboardWidgets
    : DEFAULT_PROFILE.dashboardWidgets,
  dashboardWidgetOrder: Array.isArray(p.dashboardWidgetOrder)
    ? p.dashboardWidgetOrder
    : DEFAULT_PROFILE.dashboardWidgetOrder,
  dashboardWidgetSizes: p.dashboardWidgetSizes || DEFAULT_PROFILE.dashboardWidgetSizes,
  dashboardWidgetConfig: p.dashboardWidgetConfig || DEFAULT_PROFILE.dashboardWidgetConfig,
});

export const userProfileAtom = atom<UserProfile>(DEFAULT_PROFILE);

/**
 * Hook to access and update the global user profile.
 * The profile is fetched once via the loader and set into the atom.
 * Components can read and mutate profile data through this hook.
 */
function messageFrom(err: unknown, fallback: string): Error {
  if (err instanceof BackendError) return new Error(err.detail ?? fallback);
  return err instanceof Error ? err : new Error(fallback);
}

export function useUserProfile() {
  const [profile, rawSetProfile] = useAtom(userProfileAtom);
  const [, rawSetBaseline] = useAtom(financialBaselineAtom);
  let rootData: { accessToken?: string | null } | undefined;
  try {
    // biome-ignore lint/correctness/useHookAtTopLevel: fallback when rendered outside DataRouter in unit tests
    rootData = useRouteLoaderData<{ accessToken?: string | null }>("root");
  } catch {
    rootData = undefined;
  }
  const accessToken = rootData?.accessToken;

  const setProfile = useCallback(
    (p: UserProfile | Partial<UserProfile>) => {
      const normalized = normalizeProfile(p);
      rawSetProfile(normalized);
      try {
        rawSetBaseline(userProfileToFinancialBaseline(normalized));
      } catch {
        // Continue
      }
    },
    [rawSetProfile, rawSetBaseline],
  );

  const updateProfile = useCallback(
    async (updates: UserProfileUpdate): Promise<void> => {
      const updated = await apiFetch<UserProfile>("/user-profile", {
        accessToken,
        method: "PATCH",
        body: updates,
      });
      setProfile(updated);
    },
    [setProfile, accessToken],
  );

  const markChecklistStep = useCallback(
    async (step: string, completed: boolean): Promise<void> => {
      const updated = await apiFetch<UserProfile>("/user-profile/checklist", {
        accessToken,
        method: "PATCH",
        body: { step, completed },
      });
      setProfile(updated);
    },
    [setProfile, accessToken],
  );

  const changePassword = useCallback(
    async (newPassword: string): Promise<{ success: boolean; message: string }> => {
      try {
        return await apiFetch<{ success: boolean; message: string }>(
          "/user-profile/change-password",
          { accessToken, method: "POST", body: { newPassword } },
        );
      } catch (err) {
        throw messageFrom(err, "Failed to update password");
      }
    },
    [accessToken],
  );

  const sendPasswordResetEmail = useCallback(
    async (email?: string): Promise<{ success: boolean; message: string }> => {
      try {
        return await apiFetch<{ success: boolean; message: string }>(
          "/user-profile/send-password-reset",
          { accessToken, method: "POST", body: { email } },
        );
      } catch (err) {
        throw messageFrom(err, "Failed to send password reset email");
      }
    },
    [accessToken],
  );

  const resetFinancialData = useCallback(async (): Promise<void> => {
    let result: { profile?: UserProfile } | undefined;
    try {
      result = await apiFetch<{ profile?: UserProfile }>("/user-profile/reset-financial-data", {
        accessToken,
        method: "POST",
        body: {},
      });
    } catch (err) {
      throw messageFrom(err, "Failed to reset financial data");
    }
    if (result?.profile) {
      setProfile(result.profile);
    }
  }, [setProfile, accessToken]);

  return {
    profile,
    setProfile,
    updateProfile,
    markChecklistStep,
    changePassword,
    sendPasswordResetEmail,
    resetFinancialData,
  };
}

export class HttpProfileAdapter implements ProfilePersistenceAdapter {
  constructor(private getAuthToken?: () => string | null | undefined) {}

  async getBaseline(): Promise<FinancialBaseline | null> {
    const profile = await apiFetch<UserProfile>("/user-profile", {
      accessToken: this.getAuthToken?.(),
    });
    return userProfileToFinancialBaseline(profile);
  }

  async saveBaseline(baseline: FinancialBaseline): Promise<void> {
    await apiFetch<unknown>("/user-profile", {
      accessToken: this.getAuthToken?.(),
      method: "PATCH",
      body: financialBaselineToUserProfileUpdate(baseline),
      allowEmpty: true,
    });
  }

  getSeed(): OnboardingSeedPayload | null {
    return readOnboardingSeed();
  }

  saveSeed(seed: OnboardingSeedPayload): void {
    persistOnboardingSeed(seed);
  }

  clearSeed(): void {
    clearOnboardingSeed();
  }
}
