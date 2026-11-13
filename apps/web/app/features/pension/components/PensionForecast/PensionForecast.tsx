import { SimulatorSplitLayout } from "@repo/ui";
import { type FC, useMemo } from "react";
import { Link } from "react-router";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { projectPension } from "../../forecast";
import type { PensionScenario } from "../../usePensionScenario";
import { ForecastAssumptions } from "../ForecastAssumptions";
import { ForecastChart } from "../ForecastChart";
import { ForecasterControls } from "../ForecasterControls";
import { ForecasterResults } from "../ForecasterResults";
import { PensionScenarioZone } from "../PensionScenarioZone";
import { forecastStack, growthNote, noSalaryLink, noSalaryNote } from "./PensionForecast.styles";

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
      <PensionScenarioZone isModified={false} onReset={scenario.reset}>
        <p className={noSalaryNote()}>
          Add your salary in{" "}
          <Link className={noSalaryLink()} to="/app/profile">
            Profile
          </Link>{" "}
          to project your pension.
        </p>
      </PensionScenarioZone>
    );
  }

  const years = values.horizonYears === 1 ? "year" : "years";
  return (
    <PensionScenarioZone
      announcement={`projected pot ${formatCurrency(result.finalBalance)} in ${values.horizonYears} ${years}, about ${formatCurrency(result.monthlyRetirementIncome)} a month`}
      basis={`${formatCurrency(salary)} salary, ${pct.format(employeePercent)}% you and ${pct.format(employerPercent)}% your employer`}
      isModified={scenario.isModified}
      onEditDetails={onEditDetails}
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
    </PensionScenarioZone>
  );
};

export default PensionForecast;
