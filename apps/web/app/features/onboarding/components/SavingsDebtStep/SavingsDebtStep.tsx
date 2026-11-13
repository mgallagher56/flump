import { CurrencyInput, controlProps, FormField, PercentInput } from "@repo/ui";
import type { FC } from "react";
import type { OnboardingValues } from "../../types";
import { StepFrame } from "../StepFrame";
import { savingsDebtStepRecipe } from "./SavingsDebtStep.styles";

export interface SavingsDebtStepProps {
  values: OnboardingValues;
  update: (patch: Partial<OnboardingValues>) => void;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  focusOnMount?: boolean;
}

export const SavingsDebtStep: FC<SavingsDebtStepProps> = ({
  values,
  update,
  onBack,
  onNext,
  onSkip,
  focusOnMount,
}) => {
  const classes = savingsDebtStepRecipe();
  return (
    <StepFrame
      description="Rough balances give your starting net worth. Leave a box empty if you do not know it."
      focusOnMount={focusOnMount}
      id="savings"
      onBack={onBack}
      onNext={onNext}
      onSkip={onSkip}
      title="Savings and debt"
    >
      <FormField id="baseline-savings" label="Total cash and ISA savings">
        {(field) => (
          <CurrencyInput
            {...controlProps(field)}
            min={0}
            onValueChange={(cashSavings) => update({ cashSavings })}
            placeholder="e.g. 5,000"
            value={values.cashSavings}
          />
        )}
      </FormField>

      <div className={classes.pair}>
        <FormField id="baseline-pension-pot" label="Current pension pot">
          {(field) => (
            <CurrencyInput
              {...controlProps(field)}
              min={0}
              onValueChange={(pensionPot) => update({ pensionPot })}
              placeholder="e.g. 15,000"
              value={values.pensionPot}
            />
          )}
        </FormField>
        <FormField id="baseline-pension-pct" label="Pension contribution">
          {(field) => (
            <PercentInput
              {...controlProps(field)}
              decimals={1}
              max={50}
              min={0}
              onValueChange={(pensionPercent) => update({ pensionPercent })}
              placeholder="e.g. 5"
              value={values.pensionPercent}
            />
          )}
        </FormField>
      </div>

      <FormField
        hint="Leave out your mortgage. Enter 0 if you have none."
        id="baseline-debt"
        label="Credit cards and personal loans (unsecured debt)"
      >
        {(field) => (
          <CurrencyInput
            {...controlProps(field)}
            min={0}
            onValueChange={(unsecuredDebt) => update({ unsecuredDebt })}
            placeholder="e.g. 2,000"
            value={values.unsecuredDebt}
          />
        )}
      </FormField>
    </StepFrame>
  );
};
