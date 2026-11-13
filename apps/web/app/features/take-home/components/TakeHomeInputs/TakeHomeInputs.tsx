import { Card, FormField, SliderField } from "@repo/ui";
import type { FC } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import {
  cardTitle,
  fieldStack,
  inputsRoot,
  nativeSelect,
  switchControl,
  switchDescription,
  switchList,
  switchName,
  switchRow,
  switchText,
} from "./TakeHomeInputs.styles";

export interface StudentLoanPlanOption {
  key: string;
  name: string;
  threshold: number;
}

export interface TakeHomeInputsProps {
  /** Gross annual salary, or 0 when unknown. */
  grossSalary: number;
  pensionPercent: number;
  isSalarySacrifice: boolean;
  isSalarySacrificeEmployerNi: boolean;
  studentLoanPlan: string;
  studentLoanPlans: StudentLoanPlanOption[];
  onGrossSalaryChange: (value: number) => void;
  onPensionPercentChange: (value: number) => void;
  onSalarySacrificeChange: (checked: boolean) => void;
  onEmployerNiChange: (checked: boolean) => void;
  onStudentLoanPlanChange: (plan: string) => void;
}

interface SwitchRowProps {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

const SwitchRow: FC<SwitchRowProps> = ({ label, description, checked, disabled, onChange }) => (
  <label className={switchRow()} data-disabled={disabled || undefined} data-on={checked}>
    <span className={switchText()}>
      <span className={switchName()}>{label}</span>
      {description && <span className={switchDescription()}>{description}</span>}
    </span>
    <input
      aria-checked={checked}
      checked={checked}
      className={switchControl()}
      disabled={disabled}
      role="switch"
      type="checkbox"
      onChange={(e) => onChange(e.target.checked)}
    />
  </label>
);

/** Sticky parameter column: pay, pension and student loan. Presentation only. */
export const TakeHomeInputs: FC<TakeHomeInputsProps> = ({
  grossSalary,
  pensionPercent,
  isSalarySacrifice,
  isSalarySacrificeEmployerNi,
  studentLoanPlan,
  studentLoanPlans,
  onGrossSalaryChange,
  onPensionPercentChange,
  onSalarySacrificeChange,
  onEmployerNiChange,
  onStudentLoanPlanChange,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const salaryKnown = grossSalary > 0;

  return (
    <div className={inputsRoot()}>
      <Card padding="lg">
        <h2 className={cardTitle()}>Your pay</h2>
        <div className={fieldStack()}>
          <SliderField
            format="currency"
            formatValue={(v) => formatCurrency(v)}
            label="Gross salary"
            max={250000}
            min={0}
            step={1000}
            value={salaryKnown ? grossSalary : null}
            onChange={onGrossSalaryChange}
          />
          <FormField label="Student loan plan">
            {(field) => (
              <select
                id={field.id}
                aria-describedby={field.describedBy}
                className={nativeSelect()}
                value={studentLoanPlan}
                onChange={(e) => onStudentLoanPlanChange(e.target.value)}
              >
                <option value="none">No student loan</option>
                {studentLoanPlans.map((plan) => (
                  <option key={plan.key} value={plan.key}>
                    {plan.name}, threshold {formatCurrency(plan.threshold)}
                  </option>
                ))}
              </select>
            )}
          </FormField>
        </div>
      </Card>

      <Card padding="lg">
        <h2 className={cardTitle()}>Pension</h2>
        <div className={fieldStack()}>
          <SliderField
            format="percent"
            label="Pension contribution"
            max={20}
            min={0}
            step={1}
            value={pensionPercent}
            onChange={onPensionPercentChange}
          />
          <div className={switchList()}>
            <SwitchRow
              checked={isSalarySacrifice}
              label="Salary sacrifice (saves NI)"
              onChange={onSalarySacrificeChange}
            />
            <SwitchRow
              checked={isSalarySacrifice && isSalarySacrificeEmployerNi}
              description={
                isSalarySacrifice
                  ? "Employer reinvests their 15% NI saving into your pot"
                  : "Requires salary sacrifice"
              }
              disabled={!isSalarySacrifice}
              label="Pass on employer NI"
              onChange={onEmployerNiChange}
            />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default TakeHomeInputs;
