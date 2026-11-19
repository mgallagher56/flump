import {
  ResetFinancialDataResponse,
  SendPasswordResetResponse,
  UpdateChecklistResponse,
  UpdateProfileResponse,
} from "@flump/api-contract";
import { useOptionalToast } from "@repo/ui";
import { useCallback, useMemo, useRef } from "react";
import { useRevalidator, useRouteLoaderData } from "react-router";
import { apiFetch } from "~/services/api-client";
import { BackendError } from "~/services/backend-error";
import { CONFLICT_TOAST, isConflict, reloadAfterConflict, versionEtag } from "~/services/conflict";
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
  /** Day of the month (1 to 31) the monthly check-in falls on; null = the 1st. */
  checkInDay?: number | null;
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
  /** null when never answered (owner decision 3): a stored 5 and 3 is the user's own answer. */
  pensionPercent?: number | null;
  pensionEmployerPercent?: number | null;
  isSalarySacrifice?: boolean | null;
  isSalarySacrificeEmployerNi: boolean;
  monthlySavingsTarget?: number | null;
  savingsAllocationMode: "total" | "per_account";
  savingsDefaultInterestRate: number;
  setupChecklistCompletedSteps: string[];
  /** The person closed the setup checklist (decision 13); a reset clears it. */
  setupChecklistDismissed?: boolean;
  enabledPages: string[];
  dashboardWidgets: string[];
  dashboardWidgetOrder: string[];
  dashboardWidgetSizes: Record<string, "normal" | "wide">;
  dashboardWidgetConfig: Record<string, any>;
  customBudgetCategories?: string[];
  /** Net worth choices: property with its mortgage (default on), student loan (default off). */
  netWorthCountsProperty?: boolean;
  netWorthCountsStudentLoan?: boolean;
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
  pensionPercent: null,
  pensionEmployerPercent: null,
  isSalarySacrifice: null,
  isSalarySacrificeEmployerNi: false,
  monthlySavingsTarget: null,
  savingsAllocationMode: "per_account",
  savingsDefaultInterestRate: 5.0,
  setupChecklistCompletedSteps: [],
  setupChecklistDismissed: false,
  enabledPages: ["accounts", "budget", "debt", "savings", "pension", "mortgage"],
  dashboardWidgets: ["accounts", "budget", "debt", "savings", "pension", "mortgage"],
  // Empty: the dashboard's default section order until the user moves a section.
  dashboardWidgetOrder: [],
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
  setupChecklistDismissed: Boolean(p.setupChecklistDismissed),
  onboardingCompleted: Boolean(p.onboardingCompleted),
  avatarUrl: p.avatarUrl !== undefined ? p.avatarUrl : DEFAULT_PROFILE.avatarUrl,
  age: p.age !== undefined && p.age !== null ? Number(p.age) : null,
  studentLoanPlan: p.studentLoanPlan !== undefined ? p.studentLoanPlan : null,
  birthYear: p.birthYear !== undefined && p.birthYear !== null ? Number(p.birthYear) : null,
  checkInDay: p.checkInDay !== undefined && p.checkInDay !== null ? Number(p.checkInDay) : null,
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
  // Never presume a pension answer (owner decision 3): unanswered stays null, shown as "Not set".
  pensionPercent:
    p.pensionPercent !== null && p.pensionPercent !== undefined ? Number(p.pensionPercent) : null,
  pensionEmployerPercent:
    p.pensionEmployerPercent !== null && p.pensionEmployerPercent !== undefined
      ? Number(p.pensionEmployerPercent)
      : null,
  isSalarySacrifice:
    p.isSalarySacrifice !== null && p.isSalarySacrifice !== undefined
      ? Boolean(p.isSalarySacrifice)
      : null,
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

function messageFrom(err: unknown, fallback: string): Error {
  // Only server-supplied detail or the fixed fallback reaches the UI, never a raw "Failed to fetch".
  if (err instanceof BackendError) return new Error(err.detail ?? fallback);
  return new Error(fallback);
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

/**
 * Profile writes run one at a time, in order. Each sends the version the one before it returned,
 * so two quick saves from this tab never read as a change made somewhere else.
 */
let profileWrites: Promise<unknown> = Promise.resolve();
const inOrder = <T>(write: () => Promise<T>): Promise<T> => {
  const result = profileWrites.then(write, write);
  profileWrites = result.catch(() => undefined);
  return result;
};

/**
 * The version of the profile this tab last wrote. Loader data catches up after the reload that
 * follows each save; until then the next save in the queue sends this, not the older loaded one.
 * Browser only: writes never run on the server, where module state is shared between requests.
 */
let writtenVersion: { id: string; updatedAt: string } | null = null;

const rememberWritten = (saved: { id?: string; updatedAt?: string } | null | undefined) => {
  if (saved?.id && saved.updatedAt) writtenVersion = { id: saved.id, updatedAt: saved.updatedAt };
};

/** The newer of the loaded version and the one this tab last wrote, for the same profile. */
const versionToSend = (loaded: UserProfile): string => {
  if (writtenVersion && writtenVersion.id === loaded.id) {
    // Compared as instants, so a change in how the backend writes the timestamp cannot mislead.
    return Date.parse(writtenVersion.updatedAt) > Date.parse(loaded.updatedAt)
      ? writtenVersion.updatedAt
      : loaded.updatedAt;
  }
  return loaded.updatedAt;
};

/** Test seam: forget the version this tab last wrote. */
export function forgetWrittenProfileVersion(): void {
  writtenVersion = null;
}

/**
 * The saved profile, from the root loader's data only (audit slice 8). It is the same on the
 * server render, the first client render and after hydration, so nothing flashes a default
 * (L64), and every save reloads it, so this page and the next show the saved value (L63).
 * Signed out (no profile) it reads as `DEFAULT_PROFILE`.
 */
export function useSavedProfile(): UserProfile {
  const rootData = useRouteLoaderData("root") as
    | { userProfile?: Partial<UserProfile> | null }
    | undefined;
  const loaded = rootData?.userProfile;
  return useMemo(() => (loaded ? normalizeProfile(loaded) : DEFAULT_PROFILE), [loaded]);
}

/**
 * The saved profile and the writes to it. Each successful write reloads every loader's saved data
 * (the router's revalidation) before it resolves, so a caller that awaits it sees the new figures.
 */
export function useUserProfile() {
  const profile = useSavedProfile();
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const revalidator = useRevalidator();
  const revalidatorRef = useRef(revalidator);
  revalidatorRef.current = revalidator;
  const toast = useOptionalToast()?.toast;

  const reloadSavedData = useCallback(async () => {
    await revalidatorRef.current.revalidate();
  }, []);

  const updateProfile = useCallback(
    (updates: UserProfileUpdate): Promise<void> =>
      inOrder(async () => {
        try {
          const updated = await apiFetch("/user-profile", {
            method: "PATCH",
            body: updates,
            schema: UpdateProfileResponse,
            // The version this tab last read or wrote (BE-16): a profile changed somewhere else
            // since then is not overwritten.
            ifMatch: versionEtag(versionToSend(profileRef.current)),
          });
          rememberWritten(updated);
        } catch (err) {
          // 412: say so, and reload the saved profile so the next save sends its version. The
          // caller's form keeps what was typed, because the save rejects.
          if (isConflict(err)) {
            toast?.({ ...CONFLICT_TOAST, tone: "warning" });
            reloadAfterConflict();
          }
          throw err;
        }
        await reloadSavedData();
      }),
    [reloadSavedData, toast],
  );

  /**
   * Marks one setup step done (or not done) when the person takes the action it describes, never
   * on a page visit (LD-2, CS-6). A step already in that state sends nothing.
   */
  const markChecklistStep = useCallback(
    (step: string, completed: boolean): Promise<void> => {
      const done = profileRef.current.setupChecklistCompletedSteps.includes(step);
      if (done === completed) return Promise.resolve();
      return inOrder(async () => {
        // Unconditional by contract (UNCONDITIONAL_UPDATE_ROUTES): it sets one named step. It
        // still moves the profile's version, so it shares the queue and remembers the answer.
        const updated = await apiFetch("/user-profile/checklist", {
          method: "PATCH",
          body: { step, completed },
          schema: UpdateChecklistResponse,
        });
        rememberWritten(updated);
        await reloadSavedData();
      });
    },
    [reloadSavedData],
  );

  /** Closes the setup checklist for good, on the profile (decision 13). A reset shows it again. */
  const dismissChecklist = useCallback(
    (): Promise<void> =>
      inOrder(async () => {
        const updated = await apiFetch("/user-profile/checklist", {
          method: "PATCH",
          body: { dismissed: true },
          schema: UpdateChecklistResponse,
        });
        rememberWritten(updated);
        await reloadSavedData();
      }),
    [reloadSavedData],
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
    rememberWritten(result?.profile);
    await reloadSavedData();
  }, [reloadSavedData]);

  return {
    profile,
    updateProfile,
    markChecklistStep,
    dismissChecklist,
    sendPasswordResetEmail,
    resetFinancialData,
  };
}
