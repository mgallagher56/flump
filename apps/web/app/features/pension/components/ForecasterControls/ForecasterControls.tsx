import { CollapsibleDrawer, SliderField } from "@repo/ui";
import type { FC } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { INFLATION_RATE, UK_QUALIFYING_LOWER, UK_QUALIFYING_UPPER } from "../../forecast";
import type { PensionScenario } from "../../usePensionScenario";
import { controlsPanel, toggleHint, toggleList, toggleRow } from "./ForecasterControls.styles";

/** Highest contribution the what-if slider offers, as a percentage of salary. */
export const MAX_CONTRIBUTION_PERCENT = 40;
/** Latest retirement age the slider offers. */
export const MAX_RETIREMENT_AGE = 75;

export interface ContributionSliderProps {
  scenario: PensionScenario;
}

/** Shared by both tools, so the same scenario value drives each. */
export const ContributionSlider: FC<ContributionSliderProps> = ({ scenario }) => (
  <SliderField
    format="percent"
    fractionDigits={1}
    helperText={scenario.isEdited("contributionPercent") ? "Edited. Not saved." : undefined}
    label="Your contribution"
    max={MAX_CONTRIBUTION_PERCENT}
    min={0}
    step={0.5}
    value={scenario.values.contributionPercent}
    onChange={(v) => scenario.set("contributionPercent", v)}
  />
);

export interface ForecasterControlsProps {
  scenario: PensionScenario;
  /** Saved age, when known. The time input then reads as a retirement age. */
  currentAge: number | null;
  /** Monthly figure for the State Pension option, from the tax-year registry. */
  statePensionMonthly: number;
}

/**
 * The retirement tool's inputs: three sliders (your contribution, retirement age, growth), and the
 * UK rule options behind "More options" (E16 P1.7). Salary and the employer's share are saved
 * facts, edited in "Your details", not here.
 */
export const ForecasterControls: FC<ForecasterControlsProps> = ({
  scenario,
  currentAge,
  statePensionMonthly,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const { values, set, isEdited } = scenario;

  return (
    <div className={controlsPanel()}>
      <ContributionSlider scenario={scenario} />

      {currentAge !== null ? (
        <SliderField
          helperText={isEdited("horizonYears") ? "Edited. Not saved." : undefined}
          label="Retirement age"
          max={Math.max(MAX_RETIREMENT_AGE, currentAge + 1)}
          min={currentAge + 1}
          step={1}
          value={currentAge + values.horizonYears}
          onChange={(v) => set("horizonYears", Math.max(1, v - currentAge))}
        />
      ) : (
        <SliderField
          helperText="Add your year of birth to start from your State Pension age."
          label="Years until you retire"
          max={50}
          min={1}
          step={1}
          unitSuffix=" years"
          value={values.horizonYears}
          onChange={(v) => set("horizonYears", v)}
        />
      )}

      <SliderField
        format="percent"
        fractionDigits={1}
        helperText={isEdited("growthRate") ? "Edited. Not saved." : undefined}
        label="Growth a year"
        max={12}
        min={0}
        step={0.1}
        value={values.growthRate}
        onChange={(v) => set("growthRate", v)}
      />

      <CollapsibleDrawer title="More options" variant="quiet">
        <div className={toggleList()}>
          <label className={toggleRow()} htmlFor="pension-scenario-inflation">
            <input
              checked={values.adjustForInflation}
              id="pension-scenario-inflation"
              type="checkbox"
              onChange={(e) => set("adjustForInflation", e.target.checked)}
            />
            <span>
              Show in today&apos;s money
              <span className={toggleHint()}>
                Takes off {INFLATION_RATE}% a year for inflation.
              </span>
            </span>
          </label>
          <label className={toggleRow()} htmlFor="pension-scenario-state-pension">
            <input
              checked={values.includeStatePension}
              id="pension-scenario-state-pension"
              type="checkbox"
              onChange={(e) => set("includeStatePension", e.target.checked)}
            />
            <span>
              Include the full new State Pension
              <span className={toggleHint()}>
                Adds {formatCurrency(statePensionMonthly)} a month.
              </span>
            </span>
          </label>
          <label className={toggleRow()} htmlFor="pension-scenario-qualifying">
            <input
              checked={values.useQualifyingEarnings}
              id="pension-scenario-qualifying"
              type="checkbox"
              onChange={(e) => set("useQualifyingEarnings", e.target.checked)}
            />
            <span>
              Only pay that counts for your pension
              <span className={toggleHint()}>
                Counts pay above {formatCurrency(UK_QUALIFYING_LOWER)} a year. Your scheme may call
                this qualifying earnings.
              </span>
              <span className={toggleHint()}>
                Pay above {formatCurrency(UK_QUALIFYING_UPPER)} a year does not count.
              </span>
            </span>
          </label>
        </div>
      </CollapsibleDrawer>
    </div>
  );
};

export default ForecasterControls;
