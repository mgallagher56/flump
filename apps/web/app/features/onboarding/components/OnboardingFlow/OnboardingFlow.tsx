import { Card, Icon, Stepper } from "@repo/ui";
import { TriangleAlert } from "lucide-react";
import { type FC, useEffect, useState } from "react";
import type { UserProfile } from "~/hooks/useUserProfile";
import { deriveOnboardingSummary } from "../../deriveOnboardingSummary";
import { valuesFromProfile } from "../../draft";
import { inferModules } from "../../inferModules";
import { REVIEW_STEP, STEP_IDS, STEPPER_LABELS } from "../../types";
import { useFinishOnboarding } from "../../useFinishOnboarding";
import { stepperStates, useOnboardingForm } from "../../useOnboardingForm";
import { useSaveAndExit } from "../../useSaveAndExit";
import { useSeedHydration } from "../../useSeedHydration";
import { BankStep } from "../BankStep";
import { FinishSummary } from "../FinishSummary";
import { HousingStep } from "../HousingStep";
import { IncomeStep } from "../IncomeStep";
import { LiveSummaryBar } from "../LiveSummaryBar";
import { OnboardingHeader } from "../OnboardingHeader";
import { SavingsDebtStep } from "../SavingsDebtStep";
import { SeedBanner } from "../SeedBanner";
import { onboardingFlowRecipe } from "./OnboardingFlow.styles";

export interface OnboardingFlowProps {
  /** An error from the route action, shown in the same alert as a client-side save error. */
  actionError?: string | null;
  /** The saved profile, so setup picks up after "Save and exit". */
  savedProfile?: Partial<UserProfile> | null;
}

// One-word names so no step wraps; phones show only the current step (the Stepper's summary).
const STEPPER_STEPS = STEP_IDS.map((id) => ({ id, label: STEPPER_LABELS[id] }));

export const OnboardingFlow: FC<OnboardingFlowProps> = ({
  actionError = null,
  savedProfile = null,
}) => {
  const classes = onboardingFlowRecipe();
  const form = useOnboardingForm(valuesFromProfile(savedProfile));
  const { values, step } = form;
  const summary = deriveOnboardingSummary(values);
  const modules = inferModules(values);
  const { finish, isSubmitting, error, saveState } = useFinishOnboarding(values, summary);
  const seed = useSeedHydration(form.update);
  const exit = useSaveAndExit(values, form.employmentAnswered);
  const [hasMoved, setHasMoved] = useState(false);
  const moved =
    <A extends unknown[]>(fn: (...args: A) => void) =>
    (...args: A) => {
      setHasMoved(true);
      fn(...args);
    };
  const goTo = moved(form.goTo);
  const next = moved(form.next);
  const back = moved(form.back);
  const skip = moved(form.skip);
  const goToMissing = moved(form.goToMissing);

  /** The banner is going away, so focus moves to the step it sat above rather than to the body. */
  const reviewNumbers = () => {
    seed.dismissBanner();
    const id = STEP_IDS[step - 1];
    const headingId = id === "review" ? "onboarding-review-title" : `onboarding-step-${id}-title`;
    document.getElementById(headingId)?.focus();
  };

  useEffect(() => {
    if (step === REVIEW_STEP && hasMoved) {
      document.getElementById("onboarding-review-title")?.focus();
    }
  }, [step]);

  // On the review the finish error sits beside the Finish button instead, so it is announced once.
  const alertText = exit.error ?? (step === REVIEW_STEP ? actionError : (error ?? actionError));
  const common = { focusOnMount: hasMoved };

  return (
    <div className={classes.page}>
      <div className={classes.inner}>
        <OnboardingHeader isSaving={exit.isSaving} onSaveAndExit={exit.saveAndExit} />
        <Stepper
          current={step}
          label="Setup progress"
          onStepSelect={goTo}
          states={stepperStates(form.outcomes, step)}
          steps={STEPPER_STEPS}
        />
        {alertText ? (
          <div className={classes.alert} role="alert">
            <Icon icon={TriangleAlert} size="sm" />
            <span>{alertText}</span>
          </div>
        ) : null}

        {seed.showBanner && seed.seed ? (
          <SeedBanner
            canFinish={summary.canFinish}
            hasNumbers={seed.seedHasNumbers}
            isSubmitting={isSubmitting}
            missingForFinish={summary.missingForFinish}
            onLaunch={finish}
            onReview={reviewNumbers}
            salary={seed.seed.annualIncome ?? seed.seed.annualGrossSalary}
          />
        ) : null}

        <Card as="section" className={classes.card} padding="lg">
          {step === 1 ? (
            <IncomeStep
              {...common}
              onNext={next}
              showMissing={form.showMissing}
              update={form.update}
              values={values}
            />
          ) : null}
          {step === 2 ? (
            <HousingStep
              {...common}
              onBack={back}
              onNext={next}
              onSkip={() => skip(2)}
              setHousingStatus={form.setHousingStatus}
              update={form.update}
              values={values}
            />
          ) : null}
          {step === 3 ? (
            <SavingsDebtStep
              {...common}
              onBack={back}
              onNext={next}
              onSkip={() => skip(3)}
              update={form.update}
              values={values}
            />
          ) : null}
          {step === 4 ? <BankStep {...common} onBack={back} onNext={next} /> : null}
          {step === REVIEW_STEP ? (
            <FinishSummary
              error={error}
              isSubmitting={isSubmitting}
              modules={modules}
              onBack={back}
              onEdit={goTo}
              onFinish={finish}
              onFixMissing={goToMissing}
              saveState={saveState}
              summary={summary}
              values={values}
            />
          ) : null}
          {step !== REVIEW_STEP ? (
            <LiveSummaryBar
              assumingRegion={values.taxRegion === null && values.incomeMode === "gross"}
              summary={summary}
            />
          ) : null}
        </Card>
      </div>
    </div>
  );
};
