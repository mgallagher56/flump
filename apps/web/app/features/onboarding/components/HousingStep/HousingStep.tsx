import { CurrencyInput, controlProps, FormField, RadioCardGroup } from "@repo/ui";
import type { FC, ReactNode } from "react";
import { type HousingStatus, type OnboardingValues, ownsHome, STEP_LABELS } from "../../types";
import { StepFrame } from "../StepFrame";
import { housingStepRecipe } from "./HousingStep.styles";

/** Four answers with equal weight, in a fixed order. None is picked until the person picks one. */
export const HOUSING_OPTIONS: { value: HousingStatus; label: string }[] = [
  { value: "renting", label: "Renting" },
  { value: "mortgage", label: "Paying a mortgage" },
  { value: "own_outright", label: "Own with no mortgage" },
  { value: "living_with_family", label: "Living with family or friends" },
];

/** The monthly amount's label for each answer that has one. Own with no mortgage has none. */
const COST_FIELD: Partial<Record<HousingStatus, { label: string; hint?: string }>> = {
  renting: { label: "Monthly rent" },
  mortgage: { label: "Monthly mortgage payment" },
  living_with_family: {
    label: "What you pay each month (optional)",
    hint: "You can add what you pay towards the household, if anything.",
  },
};

export interface HousingStepProps {
  values: OnboardingValues;
  update: (patch: Partial<OnboardingValues>) => void;
  setHousingStatus: (status: HousingStatus) => void;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  focusOnMount?: boolean;
  /** The live take-home figure, passed through to the step frame. */
  summary?: ReactNode;
}

export const HousingStep: FC<HousingStepProps> = ({
  values,
  update,
  setHousingStatus,
  onBack,
  onNext,
  onSkip,
  focusOnMount,
  summary,
}) => {
  const classes = housingStepRecipe();
  const status = values.housingStatus;
  const costField = status ? COST_FIELD[status] : undefined;
  return (
    <StepFrame
      description="Your regular costs show what is left over each month and your months of cover."
      focusOnMount={focusOnMount}
      summary={summary}
      id="housing"
      onBack={onBack}
      onNext={onNext}
      onSkip={onSkip}
      title={STEP_LABELS.housing}
    >
      <RadioCardGroup
        id="onboarding-housing"
        legend="Your housing"
        name="onboarding-housing"
        onValueChange={(next) => setHousingStatus(next as HousingStatus)}
        options={HOUSING_OPTIONS}
        value={status ?? ""}
      />

      {costField ? (
        <FormField hint={costField.hint} id="baseline-housing-cost" label={costField.label}>
          {(field) => (
            <CurrencyInput
              {...controlProps(field)}
              min={0}
              onValueChange={(monthlyHousingCost) => update({ monthlyHousingCost })}
              placeholder="For example, 900"
              value={values.monthlyHousingCost}
            />
          )}
        </FormField>
      ) : null}

      {ownsHome(status) ? (
        <div className={classes.pair}>
          <FormField id="baseline-property-val" label="What your home is worth">
            {(field) => (
              <CurrencyInput
                {...controlProps(field)}
                min={0}
                onValueChange={(propertyValue) => update({ propertyValue })}
                placeholder="For example, 300,000"
                value={values.propertyValue}
              />
            )}
          </FormField>
          {status === "mortgage" ? (
            <FormField id="baseline-mortgage-bal" label="Mortgage left to pay">
              {(field) => (
                <CurrencyInput
                  {...controlProps(field)}
                  min={0}
                  onValueChange={(mortgageBalance) => update({ mortgageBalance })}
                  placeholder="For example, 200,000"
                  value={values.mortgageBalance}
                />
              )}
            </FormField>
          ) : null}
        </div>
      ) : null}

      <FormField
        hint="A rough total is fine. You can split it into budget categories later."
        id="baseline-other-outgoings"
        label="Other monthly spending (bills, food, travel, subscriptions)"
      >
        {(field) => (
          <CurrencyInput
            {...controlProps(field)}
            min={0}
            onValueChange={(monthlyOtherOutgoings) => update({ monthlyOtherOutgoings })}
            placeholder="For example, 1,100"
            value={values.monthlyOtherOutgoings}
          />
        )}
      </FormField>
    </StepFrame>
  );
};
