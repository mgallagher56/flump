import {
  availableStudentLoanPlans,
  getUkTaxYearContext,
  getUkTaxYearRules,
  marginalRateCurve,
  persistOnboardingSeed,
  SUPPORTED_UK_TAX_YEARS,
  type UkIncomeScenario,
  type UkStudentLoanPlanKey,
  type UkTaxYear,
  whatIfGrossChange,
  whatIfSacrificeChange,
} from "@flump/finance-engine";
import { ArrowRight } from "lucide-react";
import { type FC, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cx } from "../../../styled-system/css";
import {
  MarginalRateChart,
  MarginalRateDataTable,
  marginalRateTableRows,
} from "../../patterns/MarginalRateChart/MarginalRateChart";
import { SimulatorSplitLayout } from "../../patterns/SimulatorSplitLayout/SimulatorSplitLayout";
import {
  asAtTaxYear,
  chartSummary,
  EXPLORER_COPY,
  liveTakeHomeMessage,
  STEPPED_ZONE_LABEL,
  STUDENT_LOAN_PLAN_LABELS,
  thresholdLabel,
} from "../../patterns/TakeHomeDeltaPanel/copy";
import { TakeHomeDeltaPanel } from "../../patterns/TakeHomeDeltaPanel/TakeHomeDeltaPanel";
import { Button } from "../../primitives/Button/Button";
import { Checkbox } from "../../primitives/Checkbox/Checkbox";
import { CollapsibleDrawer } from "../../primitives/CollapsibleDrawer/CollapsibleDrawer";
import { FormField } from "../../primitives/FormField/FormField";
import { Icon } from "../../primitives/Icon";
import { KpiCard } from "../../primitives/KpiCard/KpiCard";
import { LiveRegion } from "../../primitives/LiveRegion/LiveRegion";
import { formatMoney, Money } from "../../primitives/Money/Money";
import { Select } from "../../primitives/Select/Select";
import { SliderField } from "../../primitives/SliderField/SliderField";
import { StatusBadge } from "../../primitives/StatusBadge/StatusBadge";
import { Switch } from "../../primitives/Switch/Switch";
import { ctaLabel } from "../ctaLabel";
import {
  explorerAction,
  explorerBadges,
  explorerCard,
  explorerContent,
  explorerControls,
  explorerCta,
  explorerDetails,
  explorerFieldset,
  explorerLegend,
  explorerOutcome,
  explorerOutcomeCaption,
  explorerOutcomeLabel,
  explorerOutcomes,
  explorerRoot,
} from "./MarginalRateExplorer.styles";

export type MarginalRateExplorerRegion = "ENGLAND_NI_WALES" | "SCOTLAND";
export type MarginalRateExplorerPensionMethod =
  | "none"
  | "salary-sacrifice"
  | "net-pay"
  | "relief-at-source";

/** Flat values, so the signed-in app can hold them in `useScenarioState`. */
export type MarginalRateExplorerValues = {
  grossPay: number;
  bonus: number;
  region: MarginalRateExplorerRegion;
  pensionMethod: MarginalRateExplorerPensionMethod;
  pensionAmount: number;
  /** Plan keys joined with "+" ("plan2+postgrad"); "" for none. */
  studentLoans: string;
  childBenefit: boolean;
  children: number;
  taxYear: string;
  extraPension: number;
};

/**
 * Example starting values. The tax year is worked out when this is called (not at module load), so
 * a server render and the browser agree on the day they render.
 */
export function getMarginalRateExplorerDefaults(now?: Date): MarginalRateExplorerValues {
  return {
    grossPay: 39_000,
    bonus: 0,
    region: "ENGLAND_NI_WALES",
    pensionMethod: "none",
    pensionAmount: 0,
    studentLoans: "",
    childBenefit: false,
    children: 1,
    taxYear: getUkTaxYearContext(now).ratesYear,
    extraPension: 0,
  };
}

const DELTA_GROSS = 1000;
const CURVE_MAX = 150_000;
const EXTRA_PENSION_START = 1000;
const PLAN_ORDER: readonly UkStudentLoanPlanKey[] = [
  "plan1",
  "plan2",
  "plan4",
  "plan5",
  "postgrad",
];

export const parseStudentLoanPlans = (value: string): UkStudentLoanPlanKey[] => {
  const picked = new Set(value.split("+"));
  return PLAN_ORDER.filter((k) => picked.has(k));
};

const resolveYear = (year: string): UkTaxYear =>
  (SUPPORTED_UK_TAX_YEARS as readonly string[]).includes(year)
    ? (year as UkTaxYear)
    : getUkTaxYearContext().ratesYear;

/** The engine scenario for a set of explorer values (extra pension excluded). */
export function explorerScenario(v: MarginalRateExplorerValues): UkIncomeScenario {
  const taxYear = resolveYear(v.taxYear);
  const available = new Set(availableStudentLoanPlans(getUkTaxYearRules(taxYear)));
  const studentLoans = parseStudentLoanPlans(v.studentLoans).filter((k) => available.has(k));
  return {
    taxYear,
    region: v.region,
    salary: Math.max(0, v.grossPay),
    bonus: Math.max(0, v.bonus),
    ...(v.pensionMethod === "none"
      ? {}
      : { pension: { method: v.pensionMethod, amount: Math.max(0, v.pensionAmount) } }),
    ...(studentLoans.length > 0 ? { studentLoans } : {}),
    ...(v.childBenefit ? { childBenefit: { children: Math.max(1, Math.round(v.children)) } } : {}),
  };
}

export interface MarginalRateExplorerProps {
  values: MarginalRateExplorerValues;
  onChange: <K extends keyof MarginalRateExplorerValues>(
    key: K,
    value: MarginalRateExplorerValues[K],
  ) => void;
  /**
   * Heading level for the chart and the panel titles. Defaults to h2 when `embedded` and h3
   * otherwise; pass it to override.
   */
  headingLevel?: "h2" | "h3" | "h4";
  /**
   * Inside a tool page that already shows the title and description. The explorer has no title
   * or intro of its own, so this only sets the section headings to h2 (page outline h1 > h2).
   */
  embedded?: boolean;
  /** Rendered directly under the headline result (the standalone tool's sign-up button). */
  cta?: ReactNode;
  /**
   * The date the current tax year is worked out from. Defaults to today; tests and stories pass a
   * date to show the fallback-rates banner.
   */
  now?: Date;
  /** Shows the panel's "Guidance, not advice" notice. Pass false inside a ScenarioZone, which has its own. */
  showNotice?: boolean;
  /** Passed to the delta panel: the page's notice already carries the "Unverified estimate" sentence. */
  unverifiedInPageNotice?: boolean;
  /**
   * Inside a ScenarioZone (the signed-in take-home page). The outcome sits on the zone's surface
   * instead of in a card of its own (no card inside the zone), and the chart marks only the
   * thresholds either side of your pay. Default false: the tool pages keep their layout.
   */
  inScenarioZone?: boolean;
  className?: string;
}

/** Controlled "next £1,000" explorer: what a pay rise leaves after tax, NI, student loan and the HICBC. */
export const MarginalRateExplorer: FC<MarginalRateExplorerProps> = ({
  values,
  onChange,
  headingLevel,
  embedded = false,
  cta,
  now,
  showNotice = true,
  unverifiedInPageNotice = false,
  inScenarioZone = false,
  className,
}) => {
  const sectionHeading = headingLevel ?? (embedded ? "h2" : "h3");
  const {
    grossPay,
    bonus,
    region,
    pensionMethod,
    pensionAmount,
    studentLoans,
    childBenefit,
    children,
    taxYear,
    extraPension,
  } = values;

  const nowTime = now?.getTime();
  const context = useMemo(
    () => getUkTaxYearContext(nowTime === undefined ? undefined : new Date(nowTime)),
    [nowTime],
  );
  // The engine is always given an explicit year, so its own `isFallback` is always false. The
  // banner follows the calendar instead: today's tax year has no rates yet and the year in use is
  // the one standing in for it.
  const isFallback = context.isFallback && resolveYear(taxYear) === context.ratesYear;
  const scenario = useMemo(
    () =>
      explorerScenario({
        grossPay,
        bonus,
        region,
        pensionMethod,
        pensionAmount,
        studentLoans,
        childBenefit,
        children,
        taxYear,
        extraPension: 0,
      }),
    [
      grossPay,
      bonus,
      region,
      pensionMethod,
      pensionAmount,
      studentLoans,
      childBenefit,
      children,
      taxYear,
    ],
  );

  // The curve's shape does not depend on your own pay, so it is worked out (about 600 take-home
  // runs) only when another input changes, never while the gross pay or bonus sliders move.
  const curveScenario = useMemo(
    () =>
      explorerScenario({
        grossPay: 0,
        bonus: 0,
        region,
        pensionMethod,
        pensionAmount,
        studentLoans,
        childBenefit,
        children,
        taxYear,
        extraPension: 0,
      }),
    [region, pensionMethod, pensionAmount, studentLoans, childBenefit, children, taxYear],
  );
  const curve = useMemo(
    () => marginalRateCurve(curveScenario, { from: 0, to: CURVE_MAX, step: 250 }),
    [curveScenario],
  );
  const delta = useMemo(() => whatIfGrossChange(scenario, DELTA_GROSS), [scenario]);
  const pension = useMemo(
    () => (extraPension > 0 ? whatIfSacrificeChange(scenario, extraPension) : null),
    [scenario, extraPension],
  );

  // Once opened, the extra pension slider stays mounted when dragged to £0 (so focus is kept). It
  // closes again when the value returns to 0 from outside, such as a scenario reset.
  const [pensionOpen, setPensionOpen] = useState(extraPension > 0);
  const zeroFromSlider = useRef(false);
  useEffect(() => {
    if (extraPension > 0) setPensionOpen(true);
    else if (!zeroFromSlider.current) setPensionOpen(false);
  }, [extraPension]);

  const plansForYear = useMemo(
    () => availableStudentLoanPlans(getUkTaxYearRules(resolveYear(taxYear))),
    [taxYear],
  );
  const selectedPlans = parseStudentLoanPlans(studentLoans);
  const togglePlan = (plan: UkStudentLoanPlanKey, on: boolean) => {
    const next = new Set(selectedPlans);
    if (on) next.add(plan);
    else next.delete(plan);
    onChange("studentLoans", PLAN_ORDER.filter((k) => next.has(k)).join("+"));
  };

  const thresholds = useMemo(
    () =>
      curve.thresholds
        .filter((t) => t.grossAt !== null && t.grossAt >= 0 && t.grossAt <= CURVE_MAX)
        .map((t) => ({ gross: t.grossAt as number, label: thresholdLabel(t) })),
    [curve],
  );
  const points = useMemo(
    () => curve.points.map((p) => ({ gross: p.gross, ratePct: p.smoothedRatePct })),
    [curve],
  );
  const zones = useMemo(
    () => curve.steppedZones.map((z) => ({ from: z.from, to: z.to, label: STEPPED_ZONE_LABEL })),
    [curve],
  );

  const yourGross = delta.before.grossPay;
  const inRange = yourGross <= CURVE_MAX;
  // No figure in the summary when your pay is on the chart: the headline cards show your rate.
  const summary = chartSummary(inRange, formatMoney(CURVE_MAX).text);
  const takeHomeDigits = Number.isInteger(delta.deltaTakeHome) ? 0 : 2;
  const announcement = liveTakeHomeMessage(
    formatMoney(delta.deltaTakeHome, { fractionDigits: takeHomeDigits }).text,
  );
  const unverified = delta.before.isUnverifiedEstimate || delta.after.isUnverifiedEstimate;

  const set = onChange;

  const controls = (
    <div className={explorerControls()}>
      <SliderField
        format="currency"
        label={EXPLORER_COPY.grossPay}
        max={150_000}
        min={0}
        step={500}
        value={grossPay}
        onChange={(v) => set("grossPay", v)}
      />
      <SliderField
        format="currency"
        label={EXPLORER_COPY.bonus}
        max={50_000}
        min={0}
        step={500}
        value={bonus}
        onChange={(v) => set("bonus", v)}
      />
      {/* Named by its title, "More options"; the visible action text is left out. Holds every
          input past the first two (gross pay and bonus), including the extra pension, with the
          state in the parent. */}
      <CollapsibleDrawer
        closedLabel={inScenarioZone ? undefined : ""}
        defaultOpen={extraPension > 0}
        openLabel={inScenarioZone ? undefined : ""}
        title={EXPLORER_COPY.moreDetails}
        variant={inScenarioZone ? "quiet" : undefined}
      >
        <div className={explorerDetails()}>
          <FormField label={EXPLORER_COPY.region}>
            {(field) => (
              <Select
                aria-describedby={field.describedBy}
                id={field.id}
                options={[
                  {
                    value: "ENGLAND_NI_WALES",
                    label: EXPLORER_COPY.regionOptions.ENGLAND_NI_WALES,
                  },
                  { value: "SCOTLAND", label: EXPLORER_COPY.regionOptions.SCOTLAND },
                ]}
                value={region}
                onChange={(e) => set("region", e.target.value as MarginalRateExplorerRegion)}
              />
            )}
          </FormField>
          <FormField label={EXPLORER_COPY.pensionMethod}>
            {(field) => (
              <Select
                aria-describedby={field.describedBy}
                id={field.id}
                options={(
                  Object.keys(
                    EXPLORER_COPY.pensionMethodOptions,
                  ) as MarginalRateExplorerPensionMethod[]
                ).map((value) => ({ value, label: EXPLORER_COPY.pensionMethodOptions[value] }))}
                value={pensionMethod}
                onChange={(e) =>
                  set("pensionMethod", e.target.value as MarginalRateExplorerPensionMethod)
                }
              />
            )}
          </FormField>
          {pensionMethod !== "none" ? (
            <SliderField
              format="currency"
              label={EXPLORER_COPY.pensionAmount}
              max={40_000}
              min={0}
              step={100}
              value={pensionAmount}
              onChange={(v) => set("pensionAmount", v)}
            />
          ) : null}

          <fieldset className={explorerFieldset()}>
            <legend className={explorerLegend()}>{EXPLORER_COPY.studentLoans}</legend>
            {plansForYear.map((plan) => (
              <Checkbox
                checked={selectedPlans.includes(plan)}
                key={plan}
                label={STUDENT_LOAN_PLAN_LABELS[plan]}
                onChange={(e) => togglePlan(plan, e.target.checked)}
              />
            ))}
          </fieldset>
          <Switch
            checked={childBenefit}
            label={EXPLORER_COPY.childBenefit}
            onChange={(e) => set("childBenefit", e.target.checked)}
          />
          {childBenefit ? (
            <SliderField
              label={EXPLORER_COPY.children}
              max={6}
              min={1}
              step={1}
              value={children}
              onChange={(v) => set("children", v)}
            />
          ) : null}
          <FormField label={EXPLORER_COPY.taxYear}>
            {(field) => (
              <Select
                aria-describedby={field.describedBy}
                id={field.id}
                options={[...SUPPORTED_UK_TAX_YEARS].reverse().map((y) => ({ value: y, label: y }))}
                value={resolveYear(taxYear)}
                onChange={(e) => set("taxYear", e.target.value)}
              />
            )}
          </FormField>
          {pensionOpen || extraPension > 0 ? (
            <SliderField
              format="currency"
              label={EXPLORER_COPY.extraPension}
              max={20_000}
              min={0}
              step={100}
              value={extraPension}
              onChange={(v) => {
                zeroFromSlider.current = v === 0;
                set("extraPension", v);
              }}
            />
          ) : (
            <Button
              className={explorerAction()}
              type="button"
              variant="secondary"
              onClick={() => {
                zeroFromSlider.current = false;
                setPensionOpen(true);
                if (extraPension === 0) set("extraPension", EXTRA_PENSION_START);
              }}
            >
              {EXPLORER_COPY.modelPension}
            </Button>
          )}
        </div>
      </CollapsibleDrawer>
    </div>
  );

  const content = (
    <div className={explorerContent()}>
      {/* The tax year sits at the top of the results, in the same place as the tax trap tool. In a
          ScenarioZone it shares the outcome's label row instead. */}
      {inScenarioZone ? null : (
        <div className={explorerBadges()}>
          <StatusBadge variant="neutral">{asAtTaxYear(delta.before.ratesYear)}</StatusBadge>
        </div>
      )}
      {/* Scenario outcome, not a saved figure, so a plain outcome card rather than a KpiStrip. The
          share deducted is the rest of the £1,000, so it is a caption, not a second card. Inside a
          ScenarioZone it sits on the zone's own surface, with no card. */}
      {inScenarioZone ? (
        <div className={explorerOutcome()} data-testid="explorer-outcomes">
          <p className={explorerOutcomeLabel()}>{EXPLORER_COPY.kpiNextThousand}</p>
          <Money fractionDigits={takeHomeDigits} size="kpi" value={delta.deltaTakeHome} />
        </div>
      ) : (
        <div className={explorerOutcomes()} data-density="compact" data-testid="explorer-outcomes">
          <KpiCard
            label={EXPLORER_COPY.kpiNextThousand}
            subtext={EXPLORER_COPY.kpiNextThousandSubtext}
            value={delta.deltaTakeHome}
            valueFormat={{ fractionDigits: takeHomeDigits }}
          />
        </div>
      )}
      {cta}
      <MarginalRateChart
        headingLevel={sectionHeading}
        points={points}
        showSummary={!inRange}
        steppedZones={zones}
        summary={summary}
        showDataTable={!inScenarioZone}
        showThresholdNote={!inScenarioZone}
        thresholdFocus={inScenarioZone ? "near-pay" : "all"}
        thresholds={thresholds}
        title={EXPLORER_COPY.chartTitle}
        yourPay={inRange ? yourGross : undefined}
      />
      <TakeHomeDeltaPanel
        assumptions={pension ? pension.after.assumptions : delta.before.assumptions}
        calendarYear={context.calendarYear}
        collapseTable
        components={delta.components}
        disclosureExtra={
          inScenarioZone ? (
            <>
              {/* In the zone the tax year, the rest of the £1,000 and the dashed lines are
                  explained here, so the first view keeps to the outcome and the chart. */}
              <div className={explorerBadges()}>
                <StatusBadge variant="neutral">{asAtTaxYear(delta.before.ratesYear)}</StatusBadge>
              </div>
              <p className={explorerOutcomeCaption()}>{EXPLORER_COPY.kpiNextThousandSubtext}</p>
              <p className={explorerOutcomeCaption()}>{EXPLORER_COPY.chartThresholdsNote}</p>
              <MarginalRateDataTable
                caption={EXPLORER_COPY.chartTitle}
                rows={marginalRateTableRows(points)}
              />
            </>
          ) : undefined
        }
        mergeDisclosures={inScenarioZone}
        deltaGross={delta.deltaGross}
        headingLevel={sectionHeading}
        isFallback={isFallback}
        isUnverifiedEstimate={unverified}
        pensionPreview={
          pension
            ? {
                contribution: extraPension,
                takeHomeChange: -pension.deltaTakeHome,
                reachesPension: pension.deltaPensionGross,
              }
            : undefined
        }
        ratesYear={delta.before.ratesYear}
        showNotice={showNotice}
        showTaxYearBadge={false}
        unverifiedInPageNotice={unverifiedInPageNotice}
        takeHome={delta.deltaTakeHome}
      />
      <LiveRegion debounceMs={1000} message={announcement} visuallyHidden />
    </div>
  );

  return (
    <div
      className={cx(explorerRoot(), className)}
      data-testid="marginal-rate-explorer"
      id="marginal-rate-explorer"
    >
      <SimulatorSplitLayout
        content={content}
        contentLabel={EXPLORER_COPY.contentLabel}
        controls={controls}
        controlsLabel={EXPLORER_COPY.controlsLabel}
      />
    </div>
  );
};

/** What the sign-up button pre-fills: only the pay the visitor entered; nothing invented. */
export interface PayRiseSeedPayload {
  annualIncome: number;
  inferredModules: string[];
  timestamp: number;
}

export const PAY_RISE_DEFAULT_CTA = "Continue to sign up";

export interface MarginalRateExplorerStandaloneProps {
  initialValues?: Partial<MarginalRateExplorerValues>;
  headingLevel?: "h2" | "h3" | "h4";
  /** Inside a tool page that already shows the title and description: section headings are h2. */
  embedded?: boolean;
  /**
   * Label of the sign-up button under the headline result. The button shows only when this or
   * `onSaveAndContinue` is passed, so a use without either (a dashboard) shows none.
   */
  ctaText?: string;
  onSaveAndContinue?: (payload: PayRiseSeedPayload) => void;
  /** When false, entered figures are not written to the onboarding seed in local storage. Default true. */
  persistSeed?: boolean;
  /** The date the current tax year is worked out from. Defaults to today. */
  now?: Date;
  className?: string;
}

/** Holds its own state, for signed-out pages. Nothing is saved anywhere unless the visitor signs up. */
export const MarginalRateExplorerStandalone: FC<MarginalRateExplorerStandaloneProps> = ({
  initialValues,
  headingLevel,
  embedded = false,
  ctaText,
  onSaveAndContinue,
  persistSeed = true,
  now,
  className,
}) => {
  const [values, setValues] = useState<MarginalRateExplorerValues>(() => ({
    ...getMarginalRateExplorerDefaults(now),
    ...initialValues,
  }));
  const onChange = useCallback<MarginalRateExplorerProps["onChange"]>((key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const showCta = onSaveAndContinue !== undefined || ctaText !== undefined;
  const handleSave = () => {
    const payload: PayRiseSeedPayload = {
      annualIncome: Math.max(0, values.grossPay),
      inferredModules: ["tax", "pension"],
      timestamp: Date.now(),
    };
    if (persistSeed) persistOnboardingSeed(payload);
    if (onSaveAndContinue) {
      onSaveAndContinue(payload);
    } else if (typeof window !== "undefined") {
      window.location.href = "/signup";
    }
  };

  // The same outer card as the other calculators (only here: the signed-in take-home page renders
  // MarginalRateExplorer inside its own layout).
  return (
    <div className={cx(explorerCard(), className)} data-testid="pay-rise-tool">
      <MarginalRateExplorer
        cta={
          showCta ? (
            <Button className={explorerCta()} size="md" variant="primary" onClick={handleSave}>
              {ctaLabel(ctaText ?? PAY_RISE_DEFAULT_CTA)} <Icon icon={ArrowRight} size="sm" />
            </Button>
          ) : undefined
        }
        embedded={embedded}
        headingLevel={headingLevel}
        now={now}
        values={values}
        onChange={onChange}
      />
    </div>
  );
};

export default MarginalRateExplorer;
