import { useCallback, useState } from "react";
import { INITIAL_VALUES, type OnboardingValues, REVIEW_STEP, STEP_IDS, type StepId } from "./types";

/** How the user last left a step: with Next ("complete") or with "Skip for now" ("skipped"). */
export type StepOutcome = "complete" | "skipped";

export function useOnboardingForm() {
  const [values, setValues] = useState<OnboardingValues>(INITIAL_VALUES);
  const [step, setStep] = useState<number>(1);
  const [outcomes, setOutcomes] = useState<Partial<Record<StepId, StepOutcome>>>({});
  /**
   * Set when the review sends the user back to fill in what Finish needs, so the income step can
   * mark the missing fields. Any other move clears it.
   */
  const [showMissing, setShowMissing] = useState(false);

  const update = useCallback((patch: Partial<OnboardingValues>) => {
    setValues((current) => ({ ...current, ...patch }));
  }, []);

  const setHousingStatus = useCallback((housingStatus: OnboardingValues["housingStatus"]) => {
    setValues((current) => ({
      ...current,
      housingStatus,
      // Only a mortgage has a balance; renting has no property to value.
      mortgageBalance: housingStatus === "mortgage" ? current.mortgageBalance : null,
      propertyValue: housingStatus === "renting" ? null : current.propertyValue,
    }));
  }, []);

  const markAndAdvance = useCallback((stepNumber: number, outcome: StepOutcome) => {
    const id = STEP_IDS[stepNumber - 1];
    if (id && id !== "review") setOutcomes((current) => ({ ...current, [id]: outcome }));
    setShowMissing(false);
    setStep(Math.min(stepNumber + 1, REVIEW_STEP));
  }, []);

  const goTo = useCallback((next: number) => {
    setShowMissing(false);
    setStep(Math.min(Math.max(next, 1), REVIEW_STEP));
  }, []);

  /** From the review: back to the first step with the fields Finish needs marked as missing. */
  const goToMissing = useCallback(() => {
    setShowMissing(true);
    setStep(1);
  }, []);

  const next = useCallback(() => markAndAdvance(step, "complete"), [markAndAdvance, step]);
  const back = useCallback(() => {
    setShowMissing(false);
    setStep((s) => Math.max(s - 1, 1));
  }, []);

  /** "Skip for now": moves on and keeps whatever was entered; nothing is cleared. */
  const skip = useCallback(
    (stepNumber: number) => markAndAdvance(stepNumber, "skipped"),
    [markAndAdvance],
  );

  return {
    values,
    update,
    setValues,
    setHousingStatus,
    step,
    outcomes,
    showMissing,
    goTo,
    goToMissing,
    next,
    back,
    skip,
  };
}

export type OnboardingForm = ReturnType<typeof useOnboardingForm>;

/**
 * Stepper overrides from what the user actually did, so a skipped or never-visited step is never
 * shown as complete. Steps after the current one with no outcome keep the Stepper default.
 */
export function stepperStates(
  outcomes: Partial<Record<StepId, StepOutcome>>,
  current: number,
): Partial<Record<StepId, StepOutcome>> {
  const states: Partial<Record<StepId, StepOutcome>> = {};
  for (const [index, id] of STEP_IDS.entries()) {
    if (index + 1 === current) continue;
    const outcome = outcomes[id];
    if (outcome) states[id] = outcome;
    else if (index + 1 < current) states[id] = "skipped";
  }
  return states;
}
