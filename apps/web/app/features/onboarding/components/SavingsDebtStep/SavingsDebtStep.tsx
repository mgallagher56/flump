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
      description="Rough balances are enough to work out your net worth. Leave a box empty if you do not know the figure."
      focusOnMount={focusOnMount}
      id="savings"
      onBack={onBack}
      onNext={onNext}
      onSkip={onSkip}
      title="Savings and debt"
    >
      <FormField id="baseline-savings" label="Cash and ISA savings">
        {(field) => (
          <CurrencyInput
            {...controlProps(field)}
            min={0}
            onValueChange={(cashSavings) => update({ cashSavings })}
            placeholder="For example, 5,000"
            value={values.cashSavings}
          />
        )}
      </FormField>

      <div className={classes.pair}>
        <FormField id="baseline-pension-pot" label="Pension pot">
          {(field) => (
            <CurrencyInput
              {...controlProps(field)}
              min={0}
              onValueChange={(pensionPot) => update({ pensionPot })}
              placeholder="For example, 15,000"
              value={values.pensionPot}
            />
          )}
        </FormField>
        <FormField
          id="baseline-pension-pct"
          label="Your pension contribution (% of pay before tax)"
        >
          {(field) => (
            <PercentInput
              {...controlProps(field)}
              decimals={1}
              max={50}
              min={0}
              onValueChange={(pensionPercent) => update({ pensionPercent })}
              placeholder="For example, 5"
              value={values.pensionPercent}
            />
          )}
        </FormField>
      </div>

      <FormField
        hint="Do not include a mortgage. Enter 0 if you owe nothing on cards or loans."
        id="baseline-debt"
        label="Owed on credit cards and loans"
      >
        {(field) => (
          <CurrencyInput
            {...controlProps(field)}
            min={0}
            onValueChange={(unsecuredDebt) => update({ unsecuredDebt })}
            placeholder="For example, 2,000"
            value={values.unsecuredDebt}
          />
        )}
      </FormField>
    </StepFrame>
  );
};
