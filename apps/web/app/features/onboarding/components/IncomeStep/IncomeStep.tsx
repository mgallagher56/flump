import {
  Button,
  CurrencyInput,
  controlProps,
  FormField,
  RadioCardGroup,
  Select,
  TextInput,
} from "@repo/ui";
import type { FC } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import type { TaxRegion } from "~/hooks/useUserProfile";
import { AGE_ERROR, AGE_MAX, AGE_MIN, isInvalidAge } from "../../age";
import type { EmploymentType, IncomeMode, OnboardingValues } from "../../types";
import { StepFrame } from "../StepFrame";
import { incomeStepRecipe } from "./IncomeStep.styles";

/** Typical annual salaries, offered as shortcuts. Not a recommendation of any figure. */
export const SALARY_PRESETS = [32000, 45000, 65000] as const;

export const MISSING_GROSS_ERROR = "Enter your annual gross salary";
export const MISSING_TAKE_HOME_ERROR = "Enter your monthly take-home pay";
export const MISSING_REGION_ERROR = "Choose where you pay tax";

const REGION_OPTIONS = [
  { value: "ENGLAND", label: "England" },
  { value: "WALES", label: "Wales" },
  { value: "SCOTLAND", label: "Scotland" },
  { value: "NORTHERN_IRELAND", label: "Northern Ireland" },
];

const STUDENT_LOAN_OPTIONS = [
  { value: "NONE", label: "None" },
  { value: "PLAN_1", label: "Plan 1" },
  { value: "PLAN_2", label: "Plan 2" },
  { value: "PLAN_4", label: "Plan 4 (Scotland)" },
  { value: "PLAN_5", label: "Plan 5" },
  { value: "POSTGRAD", label: "Postgraduate Loan" },
];

const EMPLOYMENT_OPTIONS = [
  { value: "employed", label: "Employed", description: "Paid through PAYE" },
  {
    value: "self-employed",
    label: "Self-employed",
    description: "Class 4 NI and Self Assessment",
  },
];

const INCOME_MODE_OPTIONS = [
  { value: "gross", label: "Salary before tax", description: "Annual figure" },
  { value: "net", label: "Take-home after tax", description: "Monthly" },
];

export interface IncomeStepProps {
  values: OnboardingValues;
  update: (patch: Partial<OnboardingValues>) => void;
  onNext: () => void;
  onSkip: () => void;
  focusOnMount?: boolean;
  /** Mark the empty fields Finish needs (set when the review sends the user here). */
  showMissing?: boolean;
}

export const IncomeStep: FC<IncomeStepProps> = ({
  values,
  update,
  onNext,
  onSkip,
  focusOnMount,
  showMissing = false,
}) => {
  const classes = incomeStepRecipe();
  const { formatCurrency } = useFormatCurrency();
  const gross = values.incomeMode === "gross";
  // Same rule as deriveOnboardingSummary: income counts once it is above zero.
  const income = gross ? values.grossSalary : values.monthlyTakeHome;
  const incomeMissing = (income ?? 0) <= 0;
  const missingIncomeError = gross ? MISSING_GROSS_ERROR : MISSING_TAKE_HOME_ERROR;
  const incomeError = showMissing && incomeMissing ? missingIncomeError : undefined;
  const regionError = showMissing && values.taxRegion === null ? MISSING_REGION_ERROR : undefined;
  const ageError = isInvalidAge(values.age) ? AGE_ERROR : undefined;

  return (
    <StepFrame
      description="Your income gives your take-home pay. Skip anything you would rather add later."
      focusOnMount={focusOnMount}
      id="income"
      nextLabel="Next"
      onNext={onNext}
      onSkip={onSkip}
      title="You and income"
    >
      <div className={classes.pair}>
        <FormField error={ageError} id="baseline-age" label="Current age">
          {(field) => (
            <TextInput
              {...controlProps(field)}
              inputMode="numeric"
              max={AGE_MAX}
              min={AGE_MIN}
              onChange={(event) =>
                update({ age: event.target.value === "" ? null : Number(event.target.value) })
              }
              placeholder="e.g. 32"
              type="number"
              value={values.age ?? ""}
            />
          )}
        </FormField>
      </div>

      <RadioCardGroup
        id="onboarding-employment"
        legend="How you earn"
        name="onboarding-employment"
        onValueChange={(next) => update({ employmentType: next as EmploymentType })}
        options={EMPLOYMENT_OPTIONS}
        value={values.employmentType}
      />

      <RadioCardGroup
        id="onboarding-income-mode"
        legend="How you want to enter income"
        name="onboarding-income-mode"
        onValueChange={(next) => update({ incomeMode: next as IncomeMode })}
        options={INCOME_MODE_OPTIONS}
        value={values.incomeMode}
      />

      {gross ? (
        <FormField
          error={incomeError}
          hint="Needed to finish setup."
          id="baseline-income"
          label="Annual gross salary"
          required
        >
          {(field) => (
            <>
              <CurrencyInput
                {...controlProps(field)}
                min={0}
                onValueChange={(grossSalary) => update({ grossSalary })}
                placeholder="e.g. 45,000"
                value={values.grossSalary}
              />
              <fieldset className={classes.presets}>
                <legend className={classes.presetLabel}>Typical salaries</legend>
                {SALARY_PRESETS.map((preset) => (
                  <Button
                    aria-pressed={values.grossSalary === preset}
                    className={classes.presetButton}
                    key={preset}
                    onClick={() => update({ grossSalary: preset })}
                    size="sm"
                    type="button"
                    variant={values.grossSalary === preset ? "secondary" : "outline"}
                  >
                    {formatCurrency(preset)}
                  </Button>
                ))}
              </fieldset>
            </>
          )}
        </FormField>
      ) : (
        <FormField
          error={incomeError}
          hint="Needed to finish setup."
          id="baseline-income"
          label="Monthly take-home pay"
          required
        >
          {(field) => (
            <CurrencyInput
              {...controlProps(field)}
              min={0}
              onValueChange={(monthlyTakeHome) => update({ monthlyTakeHome })}
              placeholder="e.g. 2,900"
              value={values.monthlyTakeHome}
            />
          )}
        </FormField>
      )}

      <FormField
        error={regionError}
        hint="Scotland has its own income tax rates, so this changes your take-home pay. Needed to finish setup."
        id="baseline-tax-region"
        label="Where do you pay tax?"
        required
      >
        {(field) => (
          <Select
            {...controlProps(field)}
            onChange={(event) =>
              update({ taxRegion: (event.target.value || null) as TaxRegion | null })
            }
            options={REGION_OPTIONS}
            placeholder="Choose where you live"
            value={values.taxRegion ?? ""}
          />
        )}
      </FormField>

      <FormField id="baseline-student-loan" label="Student loan plan">
        {(field) => (
          <Select
            {...controlProps(field)}
            onChange={(event) => update({ studentLoanPlan: event.target.value })}
            options={STUDENT_LOAN_OPTIONS}
            value={values.studentLoanPlan}
          />
        )}
      </FormField>
    </StepFrame>
  );
};
