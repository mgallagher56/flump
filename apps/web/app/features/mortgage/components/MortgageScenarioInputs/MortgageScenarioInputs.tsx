import { SliderField } from "@repo/ui";
import type { FC } from "react";
import { rateFractionDigits } from "~/features/mortgage/mortgageFormat";
import {
  editedMark,
  inputsBody,
  inputsGrid,
  inputsHint,
  termCell,
  termPair,
} from "./MortgageScenarioInputs.styles";

export interface MortgageScenarioFigures {
  loanAmount: number;
  interestRate: number;
  remainingTerm: number;
}

export interface MortgageScenarioInputsProps {
  values: MortgageScenarioFigures;
  isEdited: (key: keyof MortgageScenarioFigures) => boolean;
  onChange: <K extends keyof MortgageScenarioFigures>(
    key: K,
    value: MortgageScenarioFigures[K],
  ) => void;
}

const plural = (n: number, unit: string): string => `${n} ${unit}${n === 1 ? "" : "s"}`;

/** Longest term the sliders offer, in years, unless the saved term is longer. */
const MAX_TERM_YEARS = 40;

const EditedNote: FC<{ show: boolean }> = ({ show }) =>
  show ? <p className={editedMark()}>Changed from your saved figure</p> : null;

/**
 * What-if starting figures, behind "More options" in the scenario zone. They start at the saved
 * balance, rate and term and only ever change the illustration: nothing here is saved or shown in
 * the headline figures. No card or heading of its own (it sits on the zone surface).
 */
export const MortgageScenarioInputs: FC<MortgageScenarioInputsProps> = ({
  values,
  isEdited,
  onChange,
}) => {
  // The term is held in years (a stored term in months reads as 18.1666...), so it is shown and
  // edited as whole years and months: "18 years 2 months", never a decimal.
  const totalMonths = Math.max(1, Math.round(values.remainingTerm * 12));
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const setTerm = (nextYears: number, nextMonths: number) =>
    onChange("remainingTerm", Math.max(1, nextYears * 12 + nextMonths) / 12);

  return (
    <div className={inputsBody()}>
      <p className={inputsHint()}>
        Try a different balance, rate or term. This only changes the illustration. To change what is
        saved, edit your details.
      </p>
      <div className={inputsGrid()}>
        <div>
          <SliderField
            format="currency"
            label="Balance to try"
            max={Math.max(1000000, values.loanAmount)}
            min={0}
            step={5000}
            value={values.loanAmount}
            onChange={(v) => onChange("loanAmount", v)}
          />
          <EditedNote show={isEdited("loanAmount")} />
        </div>
        <div>
          <SliderField
            format="percent"
            fractionDigits={rateFractionDigits(values.interestRate)}
            label="Rate to try"
            max={Math.max(15, values.interestRate)}
            min={0}
            step={0.05}
            value={values.interestRate}
            onChange={(v) => onChange("interestRate", v)}
          />
          <EditedNote show={isEdited("interestRate")} />
        </div>
        <div className={termCell()}>
          <div className={termPair()}>
            <SliderField
              formatValue={(v) => plural(v, "year")}
              label="Years left to try"
              max={Math.max(MAX_TERM_YEARS, years)}
              min={0}
              step={1}
              unitSuffix="years"
              value={years}
              onChange={(v) => setTerm(v, months)}
            />
            <SliderField
              formatValue={(v) => plural(v, "month")}
              label="Months"
              max={11}
              min={0}
              step={1}
              unitSuffix="months"
              value={months}
              onChange={(v) => setTerm(years, v)}
            />
          </div>
          <EditedNote show={isEdited("remainingTerm")} />
        </div>
      </div>
    </div>
  );
};

export default MortgageScenarioInputs;
