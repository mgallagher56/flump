import type { ProfileFacts } from "@flump/finance-engine";
import {
  DELTA_PANEL_COPY,
  ProjectionNotice,
  ScenarioZone,
  SimulatorSplitLayout,
  SliderField,
} from "@repo/ui";
import { type FC, useMemo } from "react";
import { Link } from "react-router";
import {
  CONTRIBUTION_EDITED_TEXT,
  MAX_CONTRIBUTION_PERCENT,
} from "~/features/pension/contribution";
import type { ScenarioState } from "~/hooks/useScenarioState";
import {
  computePensionTakeHomeEffect,
  isTakeHomeEffectUnverified,
  PensionTakeHomeEffect,
} from "../PensionTakeHomeEffect";
import { noSalaryLink, noSalaryNote } from "./PensionContributionScenario.styles";

export const PENSION_SCENARIO_ZONE_ID = "pension-scenario-zone";
export const PENSION_ZONE_TITLE = "Model a change to your contribution";
export { MAX_CONTRIBUTION_PERCENT };

/** The zone's one what-if input, in memory only (`useScenarioState`), seeded from saved data. */
export type PensionContributionScenarioValues = {
  /** Your contribution as a percentage of salary (8 means 8%). */
  contributionPercent: number;
};

export type PensionContributionScenarioState = ScenarioState<PensionContributionScenarioValues>;

/** Whole percentages read "5%", others keep one decimal place: "5.5%". */
export const percentDigits = (value: number | null | undefined): number =>
  typeof value === "number" && Number.isInteger(value) ? 0 : 1;

export interface PensionContributionScenarioProps {
  scenario: PensionContributionScenarioState;
  /** Saved salary. The zone asks for it when none is saved. */
  salary: number;
  hasSalary: boolean;
  /** Saved contribution, so the tool works out the change from it. */
  savedEmployeePercent: number;
  /** Saved profile facts for the take-home engine. Read only. */
  takeHomeFacts: ProfileFacts;
  /** True when the page shows another tax figure (the £100,000 line), so the notice needs the lead. */
  showsOtherTaxFigure?: boolean;
  /**
   * The zone sits below saved figures, so it starts closed. Pass `open` and `onOpenChange` when the
   * page opens it itself (the £100,000 line's "Model this contribution").
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const PENSION_ZONE_SHOW_LABEL = "Show what-if: change your contribution";

const percentText = (value: number): string =>
  `${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 }).format(value)}%`;
const wholePounds = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

/**
 * The closed zone's one line: the saved starting figures, or the contribution being illustrated
 * once it differs from the saved one. ScenarioZone renders it in its summary line, which sets
 * tabular-nums, and the figures are formatted en-GB here.
 */
export const pensionZoneSummary = (
  salary: number,
  savedPercent: number,
  scenarioPercent: number,
  isModified: boolean,
): string =>
  isModified
    ? `Your illustration: a contribution of ${percentText(scenarioPercent)} instead of ${percentText(savedPercent)}.`
    : `Starts from your contribution of ${percentText(savedPercent)} of your ${wholePounds.format(salary)} salary.`;

/**
 * The Pension page's one ScenarioZone (decision RD6): the effect of changing your contribution on
 * take-home pay. One input on the left, one outcome on the right. Pension projections live on the
 * Retirement page. The standard "Unverified estimate" sentence leads the zone's one notice whenever
 * a tax figure is shown.
 */
export const PensionContributionScenario: FC<PensionContributionScenarioProps> = ({
  scenario,
  salary,
  hasSalary,
  savedEmployeePercent,
  takeHomeFacts,
  showsOtherTaxFigure = false,
  open,
  onOpenChange,
}) => {
  const { values } = scenario;
  const deltaYear = (salary * (values.contributionPercent - savedEmployeePercent)) / 100;
  const effect = useMemo(
    () => computePensionTakeHomeEffect(takeHomeFacts, deltaYear),
    [takeHomeFacts, deltaYear],
  );
  const showsTax = hasSalary && isTakeHomeEffectUnverified(effect);
  const notice = (
    <ProjectionNotice
      lead={showsTax || showsOtherTaxFigure ? DELTA_PANEL_COPY.unverifiedBanner : undefined}
    />
  );

  if (!hasSalary) {
    return (
      <ScenarioZone id={PENSION_SCENARIO_ZONE_ID} notice={notice} title={PENSION_ZONE_TITLE}>
        <p className={noSalaryNote()}>
          Add your salary in{" "}
          <Link className={noSalaryLink()} to="/app/profile#settings-age-and-pay">
            Profile
          </Link>{" "}
          to see the effect of a change on your take-home pay.
        </p>
      </ScenarioZone>
    );
  }

  return (
    <ScenarioZone
      collapsible
      id={PENSION_SCENARIO_ZONE_ID}
      isModified={scenario.isModified}
      notice={notice}
      open={open}
      showLabel={PENSION_ZONE_SHOW_LABEL}
      summary={pensionZoneSummary(
        salary,
        savedEmployeePercent,
        values.contributionPercent,
        scenario.isModified,
      )}
      title={PENSION_ZONE_TITLE}
      onOpenChange={onOpenChange}
      onReset={scenario.reset}
    >
      <SimulatorSplitLayout
        content={<PensionTakeHomeEffect effect={effect} />}
        contentLabel="Your result"
        controls={
          <SliderField
            format="percent"
            fractionDigits={percentDigits(values.contributionPercent)}
            helperText={
              scenario.isEdited("contributionPercent") ? CONTRIBUTION_EDITED_TEXT : undefined
            }
            label="Your contribution"
            max={Math.max(MAX_CONTRIBUTION_PERCENT, savedEmployeePercent)}
            min={0}
            step={0.5}
            value={values.contributionPercent}
            onChange={(v) => scenario.set("contributionPercent", v)}
          />
        }
        controlsLabel="Your what-if input"
        controlsSpan={4}
      />
    </ScenarioZone>
  );
};

export default PensionContributionScenario;
