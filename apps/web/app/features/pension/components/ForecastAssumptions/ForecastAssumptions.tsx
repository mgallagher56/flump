import type { FC } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { INFLATION_RATE, UK_QUALIFYING_LOWER, UK_QUALIFYING_UPPER } from "../../forecast";
import type { PensionScenario } from "../../usePensionScenario";
import {
  assumptionsLegend,
  assumptionsPanel,
  savedFacts,
  toggleHint,
  toggleRow,
} from "./ForecastAssumptions.styles";

export interface ForecastAssumptionsProps {
  scenario: PensionScenario;
  /** Monthly figure for the State Pension option, from the tax-year registry. */
  statePensionMonthly: number;
  /** Saved facts, read only here. They are changed in "Your details". */
  isSalarySacrifice: boolean;
  passEmployerNi: boolean;
}

/** UK rule toggles for the illustration. Saved salary-sacrifice settings are shown, not edited. */
export const ForecastAssumptions: FC<ForecastAssumptionsProps> = ({
  scenario,
  statePensionMonthly,
  isSalarySacrifice,
  passEmployerNi,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const { values, set } = scenario;
  return (
    <fieldset className={assumptionsPanel()}>
      <legend className={assumptionsLegend()}>UK rules and assumptions</legend>

      <label className={toggleRow()} htmlFor="pension-scenario-qualifying">
        <input
          checked={values.useQualifyingEarnings}
          id="pension-scenario-qualifying"
          type="checkbox"
          onChange={(e) => set("useQualifyingEarnings", e.target.checked)}
        />
        <span>
          Qualifying earnings only
          <span className={toggleHint()}>
            Counts pay between {formatCurrency(UK_QUALIFYING_LOWER)} and{" "}
            {formatCurrency(UK_QUALIFYING_UPPER)}.
          </span>
        </span>
      </label>

      <label className={toggleRow()} htmlFor="pension-scenario-inflation">
        <input
          checked={values.adjustForInflation}
          id="pension-scenario-inflation"
          type="checkbox"
          onChange={(e) => set("adjustForInflation", e.target.checked)}
        />
        <span>
          Show in today&apos;s money
          <span className={toggleHint()}>Takes off {INFLATION_RATE}% a year for inflation.</span>
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
          <span className={toggleHint()}>Adds {formatCurrency(statePensionMonthly)} a month.</span>
        </span>
      </label>

      <ul className={savedFacts()}>
        <li>Salary sacrifice: {isSalarySacrifice ? "on" : "off"} (from your details)</li>
        <li>
          Employer NI passed on: {isSalarySacrifice && passEmployerNi ? "yes" : "no"} (from your
          details)
        </li>
      </ul>
    </fieldset>
  );
};

export default ForecastAssumptions;
