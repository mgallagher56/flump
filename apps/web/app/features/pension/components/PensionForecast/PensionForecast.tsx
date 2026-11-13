import { Button, ScenarioZone, SimulatorSplitLayout } from "@repo/ui";
import { type FC, useMemo } from "react";
import { Link } from "react-router";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { projectPension } from "../../forecast";
import type { PensionScenario } from "../../usePensionScenario";
import { ForecastAssumptions } from "../ForecastAssumptions";
import { ForecastChart } from "../ForecastChart";
import { ForecasterControls } from "../ForecasterControls";
import { ForecasterResults } from "../ForecasterResults";
import {
  forecastStack,
  growthNote,
  noSalaryLink,
  noSalaryNote,
  zoneFooter,
} from "./PensionForecast.styles";

export const PENSION_SCENARIO_ZONE_ID = "pension-scenario-zone";
const ZONE_TITLE = "Model a change to your pension";

export interface PensionForecastProps {
  scenario: PensionScenario;
  /** Saved facts. Read only: the zone never writes to them. */
  hasSalary: boolean;
  salary: number;
  employeePercent: number;
  employerPercent: number;
  isSalarySacrifice: boolean;
  passEmployerNi: boolean;
  currentPotTotal: number;
  directMonthlyContrib: number;
  portfolioReturnRate: number;
  /** True when no pot has a growth rate, so the starting rate is a placeholder. */
  growthRateIsPlaceholder: boolean;
  hasPots: boolean;
  onEditDetails?: () => void;
}

const pct = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });

/**
 * The pension scenario zone with the forecast inside it. Salary and contribution percentages are
 * saved facts shown as the basis line; the levers are illustration-only and live in `scenario`.
 */
export const PensionForecast: FC<PensionForecastProps> = ({
  scenario,
  hasSalary,
  salary,
  employeePercent,
  employerPercent,
  isSalarySacrifice,
  passEmployerNi,
  currentPotTotal,
  directMonthlyContrib,
  portfolioReturnRate,
  growthRateIsPlaceholder,
  hasPots,
  onEditDetails,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const { values } = scenario;

  const result = useMemo(
    () =>
      projectPension({
        startingPot: currentPotTotal,
        salary,
        employeePercent,
        employerPercent,
        isSalarySacrifice,
        passEmployerNi,
        directMonthlyContrib,
        extraMonthly: values.extraMonthly,
        growthRate: values.growthRate,
        horizonYears: values.horizonYears,
        useQualifyingEarnings: values.useQualifyingEarnings,
        adjustForInflation: values.adjustForInflation,
        includeStatePension: values.includeStatePension,
      }),
    [
      currentPotTotal,
      salary,
      employeePercent,
      employerPercent,
      isSalarySacrifice,
      passEmployerNi,
      directMonthlyContrib,
      values,
    ],
  );

  if (!hasSalary) {
    return (
      <ScenarioZone id={PENSION_SCENARIO_ZONE_ID} title={ZONE_TITLE}>
        <p className={noSalaryNote()}>
          Add your salary in{" "}
          <Link className={noSalaryLink()} to="/app/profile">
            Profile
          </Link>{" "}
          to project your pension.
        </p>
      </ScenarioZone>
    );
  }

  const years = values.horizonYears === 1 ? "year" : "years";
  return (
    <ScenarioZone
      announcement={
        scenario.isModified
          ? `projected pot ${formatCurrency(result.finalBalance)} in ${values.horizonYears} ${years}, about ${formatCurrency(result.monthlyRetirementIncome)} a month`
          : ""
      }
      basis={`Starting from your figures: ${formatCurrency(salary)} salary, ${pct.format(employeePercent)}% you and ${pct.format(employerPercent)}% your employer`}
      footer={
        onEditDetails ? (
          <div className={zoneFooter()}>
            <Button size="sm" type="button" variant="link" onClick={onEditDetails}>
              Update your details
            </Button>
          </div>
        ) : null
      }
      id={PENSION_SCENARIO_ZONE_ID}
      isModified={scenario.isModified}
      title={ZONE_TITLE}
      onReset={scenario.reset}
    >
      {hasPots && growthRateIsPlaceholder && (
        <p className={growthNote()}>
          No growth rate is set on your pots, so the forecast starts from a 5% placeholder. Edit a
          pot to set its rate.
        </p>
      )}
      <SimulatorSplitLayout
        content={
          <div className={forecastStack()}>
            <ForecasterResults
              directMonthlyContrib={directMonthlyContrib}
              horizonYears={values.horizonYears}
              result={result}
            />
            <ForecastChart
              adjustForInflation={values.adjustForInflation}
              growthRate={values.growthRate}
              horizonYears={values.horizonYears}
              result={result}
            />
          </div>
        }
        contentLabel="Illustrated outcome"
        controls={
          <div className={forecastStack()}>
            <ForecasterControls
              portfolioReturnRate={portfolioReturnRate}
              realGrowthRate={result.effectiveAnnualRate}
              scenario={scenario}
            />
            <ForecastAssumptions
              isSalarySacrifice={isSalarySacrifice}
              passEmployerNi={passEmployerNi}
              scenario={scenario}
              statePensionMonthly={Math.round(result.statePensionAnnual / 12)}
            />
          </div>
        }
        controlsLabel="What-if levers"
        controlsSpan={4}
      />
    </ScenarioZone>
  );
};

export default PensionForecast;
