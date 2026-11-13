import { clearOnboardingSeed } from "@flump/finance-engine";
import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useUserProfile } from "~/hooks/useUserProfile";
import { apiFetch } from "~/services/api-client";
import { BackendError } from "~/services/backend-error";
import { buildOnboardingSeedJobs } from "~/services/onboarding-seed";
import type { DashboardWidgetKey } from "~/utils/pageConfig";
import { birthYearFromAge } from "./age";
import type { OnboardingSummary } from "./deriveOnboardingSummary";
import { inferModules } from "./inferModules";
import { useOnboardingNotify } from "./notify";
import type { OnboardingValues } from "./types";

/** Nothing could be confirmed as saved. */
export const FINISH_ERROR = "We couldn't save your details. Check your connection and try again.";
/** The profile saved but some accounts or budget entries did not. */
export const PARTIAL_FINISH_ERROR =
  "We saved some of your details but not all. Check your connection and finish again to add the rest.";
export const SAVED_MESSAGE = "Your details are saved";

/**
 * What the account holds after the last Finish attempt: `idle` before any failed attempt,
 * `partial` once the profile is known to be saved but the rest is not, `unconfirmed` when an
 * attempt failed before anything was confirmed.
 */
export type FinishSaveState = "idle" | "partial" | "unconfirmed";

/**
 * The save path: profile, then baseline accounts and budget entries (each remembered so a retry
 * never duplicates), then `onboardingCompleted`, only after everything succeeded. The server
 * profile is the only store; no client baseline is written (D31).
 */
export function useFinishOnboarding(values: OnboardingValues, summary: OnboardingSummary) {
  const navigate = useNavigate();
  const notify = useOnboardingNotify();
  const { updateProfile } = useUserProfile();
  const seededRef = useRef<Set<string>>(new Set());
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

  const finish = async () => {
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
        birthYear: birthYearFromAge(values.age),
        annualSalary:
          values.incomeMode === "gross"
            ? (values.grossSalary ?? 0)
            : (values.monthlyTakeHome ?? 0) * 12,
        monthlyTakeHome: summary.monthlyTakeHome,
        employmentType: values.employmentType,
        taxRegion: values.taxRegion ?? undefined,
        studentLoanPlans: values.studentLoanPlan === "NONE" ? [] : [values.studentLoanPlan],
        housingStatus: values.housingStatus,
        monthlyHousingCost: summary.monthlyHousing,
        monthlyOtherOutgoings: summary.otherOutgoings,
        hasMortgage: values.housingStatus === "mortgage" || mortgageBalance > 0,
        homeValue: propertyValue > 0 ? propertyValue : null,
        pensionPercent: values.pensionPercent ?? undefined,
        isSalarySacrifice: values.isSalarySacrifice ?? undefined,
        enabledPages: pagesToSave,
        dashboardWidgets,
        dashboardWidgetOrder,
      });
      profileSavedRef.current = true;
      setProfileSaved(true);

      // Jobs that already succeeded are remembered so a retry never creates duplicates. The
      // backend is also asked what already exists, so a retry after a reload, a crash or a lost
      // response skips records an earlier attempt created. A failed lookup stops here (no guessing).
      const existingNames = async (endpoint: string) => {
        const rows = await apiFetch<Array<Record<string, unknown>>>(endpoint);
        if (!Array.isArray(rows)) throw new BackendError("bad-response", endpoint);
        return rows.flatMap((row) => (typeof row.name === "string" ? [row.name] : []));
      };
      const [existingAccounts, existingEntries] = await Promise.all([
        existingNames("/accounts"),
        existingNames("/budget-entries"),
      ]);
      for (const name of existingAccounts) seededRef.current.add(`account:${name}`);
      for (const name of existingEntries) seededRef.current.add(`entry:${name}`);

      const seedJobs = buildOnboardingSeedJobs({
        cash,
        pensionPot: pot,
        mortgageBalance,
        unsecuredDebt,
        monthlyTakeHome: summary.monthlyTakeHome,
        housingStatus: values.housingStatus,
        monthlyHousing: summary.monthlyHousing,
        otherOutgoings: summary.otherOutgoings,
      });

      // Every enabled job runs even if one fails, so a retry only repeats what is missing.
      const seedResults = await Promise.allSettled(
        seedJobs.map(async (job) => {
          if (!job.enabled || seededRef.current.has(job.key)) return;
          await apiFetch<unknown>(job.endpoint, { method: "POST", body: job.payload });
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
      navigate("/");
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
