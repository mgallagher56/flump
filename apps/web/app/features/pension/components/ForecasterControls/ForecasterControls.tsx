import { Button, SliderField } from "@repo/ui";
import type { FC } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { INFLATION_RATE } from "../../forecast";
import type { PensionScenario } from "../../usePensionScenario";
import {
  controlsHeading,
  controlsHint,
  controlsPanel,
  presetGroup,
  presetLegend,
  presetRow,
  realRateNote,
} from "./ForecasterControls.styles";

export interface ForecasterControlsProps {
  scenario: PensionScenario;
  /** Balance-weighted rate across your pots, when one is set. Offered as a quick pick. */
  portfolioReturnRate?: number;
  /** Growth after inflation, shown only when the inflation toggle is on. */
  realGrowthRate?: number;
}

const PRESETS = [
  { label: "3%", rate: 3 },
  { label: "5%", rate: 5 },
  { label: "7%", rate: 7 },
  { label: "9%", rate: 9 },
];

/**
 * Scenario levers only: extra monthly payment, years to retirement and growth rate. Salary and
 * contribution percentages are saved facts, so they are edited in "Your details", not here.
 */
export const ForecasterControls: FC<ForecasterControlsProps> = ({
  scenario,
  portfolioReturnRate,
  realGrowthRate,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const { values, saved, set, isEdited } = scenario;
  const portfolioRate =
    portfolioReturnRate !== undefined && portfolioReturnRate > 0
      ? Number(portfolioReturnRate.toFixed(1))
      : null;
  // Exactly one chip is pressed: when "Your pots" matches a preset rate, the pots chip wins.
  const portfolioPressed = portfolioRate !== null && values.growthRate === portfolioRate;
  const isPresetPressed = (rate: number) => !portfolioPressed && values.growthRate === rate;

  return (
    <div className={controlsPanel()}>
      <div>
        <h3 className={controlsHeading()}>What if</h3>
        <p className={controlsHint()}>
          Move these to see how the projection changes. Your saved figures stay as they are.
        </p>
      </div>

      <SliderField
        format="currency"
        helperText={
          isEdited("extraMonthly")
            ? "Edited. Not saved."
            : "Paid in on top of everything you already put in."
        }
        label="Extra each month"
        max={5000}
        min={0}
        step={10}
        value={values.extraMonthly}
        onChange={(v) => set("extraMonthly", v)}
      />

      <SliderField
        helperText={
          isEdited("horizonYears")
            ? `Edited. The starting point is ${saved.horizonYears} years.`
            : "Years until you stop paying in."
        }
        label="Years to retirement"
        max={60}
        min={1}
        step={1}
        unitSuffix=" years"
        value={values.horizonYears}
        onChange={(v) => set("horizonYears", v)}
      />

      <SliderField
        format="percent"
        helperText={
          isEdited("growthRate")
            ? `Edited. Your pots average ${saved.growthRate}% a year.`
            : "Average yearly growth before inflation."
        }
        label="Growth a year"
        max={30}
        min={0}
        step={0.1}
        value={values.growthRate}
        onChange={(v) => set("growthRate", v)}
      />

      <fieldset className={presetGroup()}>
        <legend className={presetLegend()}>Quick growth rates</legend>
        <div className={presetRow()}>
          {portfolioRate !== null && (
            <Button
              aria-pressed={portfolioPressed}
              size="sm"
              type="button"
              variant={portfolioPressed ? "primary" : "outline"}
              onClick={() => set("growthRate", portfolioRate)}
            >
              Your pots ({portfolioRate}%)
            </Button>
          )}
          {PRESETS.map((preset) => (
            <Button
              key={preset.rate}
              aria-pressed={isPresetPressed(preset.rate)}
              size="sm"
              type="button"
              variant={isPresetPressed(preset.rate) ? "primary" : "outline"}
              onClick={() => set("growthRate", preset.rate)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </fieldset>

      {values.adjustForInflation && realGrowthRate !== undefined && (
        <p className={realRateNote()}>
          {realGrowthRate.toFixed(1)}% a year after {INFLATION_RATE}% inflation.
        </p>
      )}
    </div>
  );
};

export default ForecasterControls;
