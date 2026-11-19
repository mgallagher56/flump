import {
  AccountListResponse,
  BudgetEntryListResponse,
  BudgetEntryResponse,
  CreateAccountResponse,
} from "@flump/api-contract";
import { clearOnboardingSeed } from "@flump/finance-engine";
import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { type UserProfileUpdate, useUserProfile } from "~/hooks/useUserProfile";
import { apiFetch, apiFetchAll } from "~/services/api-client";
import { buildOnboardingSeedJobs } from "~/services/onboarding-seed";
import type { DashboardWidgetKey } from "~/utils/pageConfig";
import { birthYearFromAge } from "./age";
import type { OnboardingSummary } from "./deriveOnboardingSummary";
import { inferModules } from "./inferModules";
import { useOnboardingNotify } from "./notify";
import type { OnboardingValues } from "./types";

/** Nothing could be confirmed as saved. */
export const FINISH_ERROR =
  "We could not save your details. They are still in this browser tab. Check your connection and try again.";
/** The profile saved but some accounts or budget entries did not. */
export const PARTIAL_FINISH_ERROR =
  "We saved some of your details, but not all. Check your connection, then finish again to save the rest.";
export const SAVED_MESSAGE = "Details saved";

/** The route action that creates a mortgage and its home in one call (routes/app.onboarding.mortgage-with-property.ts). */
export const MORTGAGE_WITH_PROPERTY_ACTION = "/app/onboarding/mortgage-with-property";

/**
 * Where Finish goes once everything is saved: the dashboard, or the budget page with the wizard
 * open to add common budget items (`?setup=common`, no money in the URL).
 */
export type FinishDestination = "dashboard" | "budget";
export const FINISH_PATHS: Record<FinishDestination, string> = {
  dashboard: "/",
  budget: "/app/budget?setup=common",
};

/**
 * What the account holds after the last Finish attempt: `idle` before any failed attempt,
 * `partial` once the profile is known to be saved but the rest is not, `unconfirmed` when an
 * attempt failed before anything was confirmed.
 */
export type FinishSaveState = "idle" | "partial" | "unconfirmed";

/**
 * The profile facts Finish saves, so the Dashboard's take-home (`selectTakeHome` over the saved
 * profile) equals the figure onboarding showed whenever the pension is answered or the take-home
 * was typed:
 * - take-home mode saves the typed figure as `monthlyTakeHome` and no salary (owner decision 2
 *   option A); it is net pay, never turned into a salary;
 * - salary mode saves the salary and no typed take-home (the engine works it out);
 * - a blank pension field is never saved (not as 0, not presumed), so it stays "Not set".
 */
export function onboardingProfileUpdate(
  values: OnboardingValues,
  summary: Pick<OnboardingSummary, "monthlyHousing" | "otherOutgoings">,
  { firstRun }: { firstRun: boolean },
): UserProfileUpdate {
  const mortgageBalance = values.mortgageBalance ?? 0;
  const gross = values.incomeMode === "gross";
  const typed = values.monthlyTakeHome ?? 0;
  return {
    birthYear: birthYearFromAge(values.age),
    annualSalary: gross ? (values.grossSalary ?? null) : null,
    monthlyTakeHome: gross ? null : typed > 0 ? typed : null,
    employmentType: values.employmentType,
    taxRegion: values.taxRegion ?? undefined,
    studentLoanPlans: values.studentLoanPlan === "NONE" ? [] : [values.studentLoanPlan],
    // Not answered sends nothing, so a saved answer is never cleared or presumed.
    ...(values.housingStatus === null
      ? {}
      : { housingStatus: values.housingStatus, monthlyHousingCost: summary.monthlyHousing }),
    monthlyOtherOutgoings: summary.otherOutgoings,
    hasMortgage: values.housingStatus === "mortgage" || mortgageBalance > 0,
    // Blank is left out: never saved as 0 and never presumed (owner decision 3).
    ...(values.pensionPercent !== null ? { pensionPercent: values.pensionPercent } : {}),
    // Not asked in onboarding: on the first run save net pay, the method the summary's take-home
    // (and the budget income row) used. On a later run leave the field out, so a choice saved
    // since (in settings or on the pension page) is never overwritten.
    ...(values.isSalarySacrifice !== null
      ? { isSalarySacrifice: values.isSalarySacrifice }
      : firstRun
        ? { isSalarySacrifice: false }
        : {}),
  };
}

/**
 * The save path: profile, then baseline accounts and budget entries (each remembered so a retry
 * never duplicates), then `onboardingCompleted`, only after everything succeeded. The server
 * profile is the only store; no client baseline is written (D31).
 */
export function useFinishOnboarding(values: OnboardingValues, summary: OnboardingSummary) {
  const navigate = useNavigate();
  const notify = useOnboardingNotify();
  const { updateProfile, profile } = useUserProfile();
  const seededRef = useRef<Set<string>>(new Set());
  // One key per opening of onboarding, forwarded by the pair's route action as the backend
  // Idempotency-Key, so a double submit or a retry after a lost answer saves the pair once.
  const pairKeyRef = useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `onboarding-${Date.now()}`,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  // A ref as well as state: the catch below must see a save made earlier in the same attempt.
  const profileSavedRef = useRef(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const submittingRef = useRef(false);

  const fail = () => {
    setAttempted(true);
    setError(profileSavedRef.current ? PARTIAL_FINISH_ERROR : FINISH_ERROR);
  };

  const finish = async (destination: FinishDestination = "dashboard") => {
    if (!summary.canFinish || submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setError(null);
    const pagesToSave = inferModules(values);
    const dashboardWidgets: DashboardWidgetKey[] = [...pagesToSave];
    const dashboardWidgetOrder: DashboardWidgetKey[] = [...pagesToSave];
    const cash = values.cashSavings ?? 0;
    const pot = values.pensionPot ?? 0;
    const mortgageBalance = values.mortgageBalance ?? 0;
    const propertyValue = values.propertyValue ?? 0;
    const unsecuredDebt = values.unsecuredDebt ?? 0;

    try {
      // Balances (cash, pension pot, cards, mortgage) are saved as account rows below, not here.
      await updateProfile({
        ...onboardingProfileUpdate(values, summary, {
          firstRun: !profile?.onboardingCompleted,
        }),
        enabledPages: pagesToSave,
        dashboardWidgets,
        dashboardWidgetOrder,
      });
      profileSavedRef.current = true;
      setProfileSaved(true);

      // Jobs that already succeeded are remembered so a retry never creates duplicates. The
      // backend is also asked what already exists, so a retry after a reload, a crash or a lost
      // response skips records an earlier attempt created. A failed lookup stops here (no guessing).
      const names = (rows: Array<{ name: string }>) => rows.map((row) => row.name);
      const [existingAccounts, existingEntries] = await Promise.all([
        apiFetchAll("/accounts", { schema: AccountListResponse }),
        apiFetchAll("/budget-entries", { schema: BudgetEntryListResponse }),
      ]);
      for (const name of names(existingAccounts)) seededRef.current.add(`account:${name}`);
      for (const name of names(existingEntries)) seededRef.current.add(`entry:${name}`);
      // Any saved Property account already holds the home (whatever it is called), so a re-run
      // never seeds a second one and counts the home twice.
      const hasProperty = existingAccounts.some((row) => row.type === "Property");

      const seedJobs = buildOnboardingSeedJobs({
        cash,
        pensionPot: pot,
        mortgageBalance,
        propertyValue,
        unsecuredDebt,
        monthlyTakeHome: summary.monthlyTakeHome,
        housingStatus: values.housingStatus,
        monthlyHousing: summary.monthlyHousing,
        otherOutgoings: summary.otherOutgoings,
      });

      // Every enabled job runs even if one fails, so a retry only repeats what is missing.
      const seedResults = await Promise.allSettled(
        seedJobs.map(async (job) => {
          if (!job.enabled) return;
          if (job.endpoint === "/accounts/mortgage-with-property") {
            // The mortgage and its home in one transaction. An earlier attempt may have saved
            // either one already (by its name, or any Property for the home): then only the
            // missing one is added, on its own.
            const mortgageSaved = seededRef.current.has(job.key);
            if (mortgageSaved && hasProperty) return;
            // Built outside the calls, so the conditional-writes law can read each call.
            const homeOnly = {
              ...job.payload.property,
              type: "Property",
              accountSubtype: "home",
              isCurrent: true,
            };
            const mortgageOnly = { ...job.payload.mortgage, type: "Mortgage" };
            if (mortgageSaved) {
              await apiFetch("/accounts", {
                method: "POST",
                body: homeOnly,
                schema: CreateAccountResponse,
              });
            } else if (hasProperty) {
              await apiFetch("/accounts", {
                method: "POST",
                body: mortgageOnly,
                schema: CreateAccountResponse,
              });
            } else {
              // Made on the server by a route action, so the browser's /api proxy allow-list is
              // unchanged (system audit slice 4).
              const response = await fetch(MORTGAGE_WITH_PROPERTY_ACTION, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ payload: job.payload, key: pairKeyRef.current }),
              });
              if (!response.ok) throw new Error(`mortgage with property ${response.status}`);
            }
            seededRef.current.add(job.key);
            return;
          }
          if (seededRef.current.has(job.key)) return;
          if (hasProperty && job.payload.type === "Property") return;
          // The method is written out in each call, so the conditional-writes law can read it.
          if (job.endpoint === "/accounts") {
            await apiFetch(job.endpoint, {
              method: "POST",
              body: job.payload,
              schema: CreateAccountResponse,
            });
          } else {
            await apiFetch(job.endpoint, {
              method: "POST",
              body: job.payload,
              schema: BudgetEntryResponse,
            });
          }
          seededRef.current.add(job.key);
        }),
      );

      if (seedResults.some((r) => r.status === "rejected")) {
        fail();
        return;
      }

      // Only now is onboarding complete; a failed seed leaves the flag false so the user stays here.
      await updateProfile({ onboardingCompleted: true });

      clearOnboardingSeed();
      notify(SAVED_MESSAGE);
      // Anything but a known destination (a click event passed by mistake, say) goes home.
      navigate(FINISH_PATHS[destination] ?? FINISH_PATHS.dashboard);
    } catch (err) {
      console.error("Error saving onboarding settings:", err);
      fail();
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const saveState: FinishSaveState = !attempted ? "idle" : profileSaved ? "partial" : "unconfirmed";

  return { finish, isSubmitting, error, profileSaved, saveState };
}
