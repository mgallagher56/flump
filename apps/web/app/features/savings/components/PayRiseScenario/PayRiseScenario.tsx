import { Button, Icon, Money, ScenarioZone } from "@repo/ui";
import { X } from "lucide-react";
import type { FC } from "react";
import { removeLabel, rowRoot, rowText } from "./PayRiseScenario.styles";

export interface PayRiseScenarioProps {
  /** Extra take-home a month from the pay rise modelled on the Take-home page. */
  monthlyIncrease: number;
  onRemove: () => void;
}

/**
 * The pay rise handed over from Take-home pay, shown as a removable scenario input. It feeds the
 * forecaster only; the saved figures above never include it.
 */
export const PayRiseScenario: FC<PayRiseScenarioProps> = ({ monthlyIncrease, onRemove }) => (
  <ScenarioZone title="Model a change to your savings">
    <div className={rowRoot()}>
      <p className={rowText()}>
        Pay rise from take-home: <Money size="md" value={Math.round(monthlyIncrease * 12)} /> a year
      </p>
      <Button size="sm" variant="outline" onClick={onRemove}>
        <Icon icon={X} size="sm" />
        Remove<span className={removeLabel()}> pay rise from take-home</span>
      </Button>
    </div>
  </ScenarioZone>
);

export default PayRiseScenario;
