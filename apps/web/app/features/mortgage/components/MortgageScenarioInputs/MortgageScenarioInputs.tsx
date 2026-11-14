import { SliderField } from "@repo/ui";
import type { FC } from "react";
import { editedMark, inputsBody, inputsGrid, inputsHint } from "./MortgageScenarioInputs.styles";

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
}) => (
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
          fractionDigits={2}
          label="Rate to try"
          max={Math.max(15, values.interestRate)}
          min={0}
          step={0.05}
          value={values.interestRate}
          onChange={(v) => onChange("interestRate", v)}
        />
        <EditedNote show={isEdited("interestRate")} />
      </div>
      <div>
        <SliderField
          label="Years left to try"
          max={Math.max(40, Math.ceil(values.remainingTerm))}
          min={1}
          step={1}
          unitSuffix="years"
          value={values.remainingTerm}
          onChange={(v) => onChange("remainingTerm", v)}
        />
        <EditedNote show={isEdited("remainingTerm")} />
      </div>
    </div>
  </div>
);

export default MortgageScenarioInputs;
