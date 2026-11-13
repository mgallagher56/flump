import { CurrencyInput, controlProps, FormField, RadioCardGroup } from "@repo/ui";
import type { FC } from "react";
import type { HousingStatus, OnboardingValues } from "../../types";
import { StepFrame } from "../StepFrame";
import { housingStepRecipe } from "./HousingStep.styles";

const HOUSING_OPTIONS = [
  { value: "renting", label: "Renting" },
  { value: "mortgage", label: "Mortgage" },
  { value: "own_outright", label: "Own outright" },
];

export interface HousingStepProps {
  values: OnboardingValues;
  update: (patch: Partial<OnboardingValues>) => void;
  setHousingStatus: (status: HousingStatus) => void;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  focusOnMount?: boolean;
}

export const HousingStep: FC<HousingStepProps> = ({
  values,
  update,
  setHousingStatus,
  onBack,
  onNext,
  onSkip,
  focusOnMount,
}) => {
  const classes = housingStepRecipe();
  const status = values.housingStatus;
  return (
    <StepFrame
      description="Regular costs give your monthly surplus and months of cover."
      focusOnMount={focusOnMount}
      id="housing"
      onBack={onBack}
      onNext={onNext}
      onSkip={onSkip}
      title="Housing and outgoings"
    >
      <RadioCardGroup
        id="onboarding-housing"
        legend="Housing status"
        name="onboarding-housing"
        onValueChange={(next) => setHousingStatus(next as HousingStatus)}
        options={HOUSING_OPTIONS}
        value={status}
      />

      {status !== "own_outright" ? (
        <FormField
          id="baseline-housing-cost"
          label={status === "mortgage" ? "Monthly mortgage payment" : "Monthly rent"}
        >
          {(field) => (
            <CurrencyInput
              {...controlProps(field)}
              min={0}
              onValueChange={(monthlyHousingCost) => update({ monthlyHousingCost })}
              placeholder="e.g. 900"
              value={values.monthlyHousingCost}
            />
          )}
        </FormField>
      ) : null}

      {status !== "renting" ? (
        <div className={classes.pair}>
          <FormField id="baseline-property-val" label="Property value">
            {(field) => (
              <CurrencyInput
                {...controlProps(field)}
                min={0}
                onValueChange={(propertyValue) => update({ propertyValue })}
                placeholder="e.g. 300,000"
                value={values.propertyValue}
              />
            )}
          </FormField>
          {status === "mortgage" ? (
            <FormField id="baseline-mortgage-bal" label="Mortgage balance">
              {(field) => (
                <CurrencyInput
                  {...controlProps(field)}
                  min={0}
                  onValueChange={(mortgageBalance) => update({ mortgageBalance })}
                  placeholder="e.g. 200,000"
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
        label="Other monthly outgoings (bills, living, subscriptions, food)"
      >
        {(field) => (
          <CurrencyInput
            {...controlProps(field)}
            min={0}
            onValueChange={(monthlyOtherOutgoings) => update({ monthlyOtherOutgoings })}
            placeholder="e.g. 1,100"
            value={values.monthlyOtherOutgoings}
          />
        )}
      </FormField>
    </StepFrame>
  );
};
