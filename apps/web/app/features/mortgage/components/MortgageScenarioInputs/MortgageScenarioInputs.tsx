import { SliderField } from "@repo/ui";
import type { FC } from "react";
import {
  editedMark,
  inputsCard,
  inputsGrid,
  inputsHeading,
  inputsHint,
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

const EditedNote: FC<{ show: boolean }> = ({ show }) =>
  show ? <p className={editedMark()}>Changed from your saved figure</p> : null;

/**
 * What-if starting figures. They start at the saved balance, rate and term and only ever change
 * the illustration below: nothing here is saved or shown in "Where you stand".
 */
export const MortgageScenarioInputs: FC<MortgageScenarioInputsProps> = ({
  values,
  isEdited,
  onChange,
}) => (
  <div className={inputsCard()}>
    <div>
      <h3 className={inputsHeading()}>Try different starting figures</h3>
      <p className={inputsHint()}>
        These sliders only change the illustration. To change what is saved, edit your details.
      </p>
    </div>
    <div className={inputsGrid()}>
      <div>
        <SliderField
          label="Balance to try"
          max={1000000}
          min={0}
          step={5000}
          unitPrefix="£"
          value={values.loanAmount}
          onChange={(v) => onChange("loanAmount", v)}
        />
        <EditedNote show={isEdited("loanAmount")} />
      </div>
      <div>
        <SliderField
          label="Rate to try"
          max={15}
          min={0}
          step={0.05}
          unitSuffix="%"
          value={values.interestRate}
          onChange={(v) => onChange("interestRate", v)}
        />
        <EditedNote show={isEdited("interestRate")} />
      </div>
      <div>
        <SliderField
          label="Term to try"
          max={40}
          min={0}
          step={1}
          unitSuffix="yrs"
          value={values.remainingTerm}
          onChange={(v) => onChange("remainingTerm", v)}
        />
        <EditedNote show={isEdited("remainingTerm")} />
      </div>
    </div>
  </div>
);

export default MortgageScenarioInputs;
