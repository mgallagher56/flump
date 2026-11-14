import type { ProfileFacts } from "@flump/finance-engine";
import {
  DELTA_PANEL_COPY,
  formatMoney,
  ProjectionNotice,
  ScenarioZone,
  SimulatorSplitLayout,
  Tabs,
} from "@repo/ui";
import { type FC, useMemo } from "react";
import { Link } from "react-router";
import { type ForecastInput, type ForecastResult, projectPension } from "../../forecast";
import type { PensionScenario, PensionScenarioValues } from "../../usePensionScenario";
import { ForecastChart } from "../ForecastChart";
import { ContributionSlider, ForecasterControls } from "../ForecasterControls";
import { ForecasterResults } from "../ForecasterResults";
import {
  computePensionTakeHomeEffect,
  isTakeHomeEffectUnverified,
  PensionTakeHomeEffect,
} from "../PensionTakeHomeEffect";
import { forecastStack, noSalaryLink, noSalaryNote } from "./PensionForecast.styles";

export const PENSION_SCENARIO_ZONE_ID = "pension-scenario-zone";
export const PENSION_ZONE_TITLE = "Model a change to your pension";

export type PensionTool = "retirement" | "takeHome";

export const PENSION_TOOL_LABELS: Record<PensionTool, string> = {
  retirement: "At retirement",
  takeHome: "Take-home pay",
};

/** Saved facts the projection starts from. Read only: the zone never writes to them. */
export interface PensionForecastBase {
  salary: number;
  employerPercent: number;
  isSalarySacrifice: boolean;
  passEmployerNi: boolean;
  currentPotTotal: number;
  directMonthlyContrib: number;
}

/** One projection input from the saved base plus scenario (or saved) values. */
export const buildForecastInput = (
  base: PensionForecastBase,
  values: PensionScenarioValues,
): ForecastInput => ({
  startingPot: base.currentPotTotal,
  salary: base.salary,
  employeePercent: values.contributionPercent,
  employerPercent: base.employerPercent,
  isSalarySacrifice: base.isSalarySacrifice,
  passEmployerNi: base.passEmployerNi,
  directMonthlyContrib: base.directMonthlyContrib,
  extraMonthly: 0,
  growthRate: values.growthRate,
  horizonYears: values.horizonYears,
  useQualifyingEarnings: values.useQualifyingEarnings,
  adjustForInflation: values.adjustForInflation,
  includeStatePension: values.includeStatePension,
});

/** "at 67" when the age is known, else "in 25 years". */
export const retirementWhenLabel = (currentAge: number | null, horizonYears: number): string =>
  currentAge !== null
    ? `at ${currentAge + horizonYears}`
    : `in ${horizonYears} ${horizonYears === 1 ? "year" : "years"}`;

export interface PensionForecastProps extends PensionForecastBase {
  scenario: PensionScenario;
  /** The same projection at the saved figures (also read by the page's estimate KPI). */
  savedResult: ForecastResult;
  hasSalary: boolean;
  /** Saved age, when known, so the time input reads as a retirement age. */
  currentAge: number | null;
  /** Saved contribution, so the take-home tool works out the change from it. */
  savedEmployeePercent: number;
  /** Saved profile facts for the take-home tool. Omit to show the retirement tool only. */
  takeHomeFacts?: ProfileFacts;
  tool: PensionTool;
  onToolChange: (tool: PensionTool) => void;
  /** True when the page shows another tax figure (the £100,000 line), so the notice needs the lead. */
  showsOtherTaxFigure?: boolean;
}

const money = (n: number) => formatMoney(n, { fractionDigits: 0 }).text;

/**
 * The page's one ScenarioZone (E16 P1.7): up to two tools as `Tabs`, one visible at a time, each a
 * `SimulatorSplitLayout` with at most three inputs on the left and one outcome on the right. The
 * page's single notice sits in the zone footer, with the standard "Unverified estimate" sentence
 * first whenever a tax figure is shown.
 */
export const PensionForecast: FC<PensionForecastProps> = ({
  scenario,
  savedResult,
  hasSalary,
  currentAge,
  savedEmployeePercent,
  takeHomeFacts,
  tool,
  onToolChange,
  showsOtherTaxFigure = false,
  ...base
}) => {
  const { values } = scenario;
  const result = useMemo(
    () =>
      projectPension(
        buildForecastInput(
          {
            salary: base.salary,
            employerPercent: base.employerPercent,
            isSalarySacrifice: base.isSalarySacrifice,
            passEmployerNi: base.passEmployerNi,
            currentPotTotal: base.currentPotTotal,
            directMonthlyContrib: base.directMonthlyContrib,
          },
          values,
        ),
      ),
    [
      base.salary,
      base.employerPercent,
      base.isSalarySacrifice,
      base.passEmployerNi,
      base.currentPotTotal,
      base.directMonthlyContrib,
      values,
    ],
  );

  const deltaYear = (base.salary * (values.contributionPercent - savedEmployeePercent)) / 100;
  const effect = useMemo(
    () => (takeHomeFacts ? computePensionTakeHomeEffect(takeHomeFacts, deltaYear) : null),
    [takeHomeFacts, deltaYear],
  );

  if (!hasSalary) {
    return (
      <ScenarioZone
        id={PENSION_SCENARIO_ZONE_ID}
        notice={
          <ProjectionNotice
            lead={showsOtherTaxFigure ? DELTA_PANEL_COPY.unverifiedBanner : undefined}
          />
        }
        title={PENSION_ZONE_TITLE}
      >
        <p className={noSalaryNote()}>
          Add your salary in{" "}
          <Link className={noSalaryLink()} to="/app/profile">
            Profile
          </Link>{" "}
          to see a pension estimate.
        </p>
      </ScenarioZone>
    );
  }

  const activeTool: PensionTool = effect ? tool : "retirement";
  const showsTakeHomeTax =
    activeTool === "takeHome" && effect !== null && isTakeHomeEffectUnverified(effect);
  const whenLabel = retirementWhenLabel(currentAge, values.horizonYears);
  const statePensionMonthly = Math.round(result.statePensionAnnual / 12);

  const retirementTool = (
    <SimulatorSplitLayout
      content={
        <div className={forecastStack()}>
          <ForecasterResults
            inTodaysMoney={values.adjustForInflation}
            result={result}
            savedResult={savedResult}
            whenLabel={whenLabel}
          />
          <ForecastChart
            adjustForInflation={values.adjustForInflation}
            annotationLabel={
              currentAge !== null ? `Retire at ${currentAge + values.horizonYears}` : "Retire"
            }
            result={result}
            whenLabel={whenLabel}
          />
        </div>
      }
      contentLabel="Your result"
      controls={
        <ForecasterControls
          currentAge={currentAge}
          scenario={scenario}
          statePensionMonthly={statePensionMonthly}
        />
      }
      controlsLabel="Your what-if inputs"
      controlsSpan={4}
    />
  );

  const takeHomeTool = effect ? (
    <SimulatorSplitLayout
      content={<PensionTakeHomeEffect effect={effect} />}
      contentLabel="Your result"
      controls={<ContributionSlider scenario={scenario} />}
      controlsLabel="Your what-if inputs"
      controlsSpan={4}
    />
  ) : null;

  return (
    <ScenarioZone
      announcement={
        scenario.isModified ? `estimated pot ${money(result.finalBalance)} ${whenLabel}` : ""
      }
      id={PENSION_SCENARIO_ZONE_ID}
      isModified={scenario.isModified}
      notice={
        <ProjectionNotice
          lead={
            showsTakeHomeTax || showsOtherTaxFigure ? DELTA_PANEL_COPY.unverifiedBanner : undefined
          }
        />
      }
      title={PENSION_ZONE_TITLE}
      tools={
        takeHomeTool ? (
          <Tabs
            aria-label="Pension tools"
            items={[
              { value: "retirement", label: PENSION_TOOL_LABELS.retirement },
              { value: "takeHome", label: PENSION_TOOL_LABELS.takeHome },
            ]}
            panels={{ retirement: retirementTool, takeHome: takeHomeTool }}
            size="sm"
            value={activeTool}
            onValueChange={(v) => onToolChange(v as PensionTool)}
          />
        ) : undefined
      }
      onReset={scenario.reset}
    >
      {takeHomeTool ? null : retirementTool}
    </ScenarioZone>
  );
};

export default PensionForecast;
