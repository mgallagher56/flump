import {
  availableStudentLoanPlans,
  getUkTaxYearContext,
  getUkTaxYearRules,
  marginalRateCurve,
  SUPPORTED_UK_TAX_YEARS,
  type UkIncomeScenario,
  type UkStudentLoanPlanKey,
  type UkTaxYear,
  whatIfGrossChange,
  whatIfSacrificeChange,
} from "@flump/finance-engine";
import { type FC, useCallback, useMemo, useState } from "react";
import { cx } from "../../../styled-system/css";
import { KpiStrip } from "../../patterns/KpiStrip/KpiStrip";
import { MarginalRateChart } from "../../patterns/MarginalRateChart/MarginalRateChart";
import { SimulatorSplitLayout } from "../../patterns/SimulatorSplitLayout/SimulatorSplitLayout";
import {
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
import { KpiCard } from "../../primitives/KpiCard/KpiCard";
import { LiveRegion } from "../../primitives/LiveRegion/LiveRegion";
import { formatMoney, formatNumber, Money, Num } from "../../primitives/Money/Money";
import { Select } from "../../primitives/Select/Select";
import { SliderField } from "../../primitives/SliderField/SliderField";
import { Switch } from "../../primitives/Switch/Switch";
import {
  explorerAction,
  explorerContent,
  explorerControls,
  explorerDetails,
  explorerFieldset,
  explorerLegend,
  explorerNumeric,
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

export const MARGINAL_RATE_EXPLORER_DEFAULTS: MarginalRateExplorerValues = {
  grossPay: 39_000,
  bonus: 0,
  region: "ENGLAND_NI_WALES",
  pensionMethod: "none",
  pensionAmount: 0,
  studentLoans: "",
  childBenefit: false,
  children: 1,
  taxYear: getUkTaxYearContext().ratesYear,
  extraPension: 0,
};

const DELTA_GROSS = 1000;
const CURVE_MAX = 150_000;
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
  /** Heading level for the chart and the panel titles. Defaults to h3. */
  headingLevel?: "h2" | "h3" | "h4";
  className?: string;
}

const pctDigits = (n: number) => (Number.isInteger(n) ? 0 : 1);

/** Controlled "next £1,000" explorer: what a pay rise leaves after tax, NI, student loan and the HICBC. */
export const MarginalRateExplorer: FC<MarginalRateExplorerProps> = ({
  values,
  onChange,
  headingLevel = "h3",
  className,
}) => {
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

  const context = useMemo(() => getUkTaxYearContext(), []);
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

  // About 600 take-home runs: memoised on the scenario, never on the extra pension slider.
  const curve = useMemo(
    () => marginalRateCurve(scenario, { from: 0, to: CURVE_MAX, step: 250 }),
    [scenario],
  );
  const delta = useMemo(() => whatIfGrossChange(scenario, DELTA_GROSS), [scenario]);
  const pension = useMemo(
    () => (extraPension > 0 ? whatIfSacrificeChange(scenario, extraPension) : null),
    [scenario, extraPension],
  );

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

  const yourGross = curve.yourPay.gross;
  const yourRate = curve.yourPay.next.effectiveMarginalRatePct;
  const summary = chartSummary(
    formatMoney(CURVE_MAX).text,
    yourGross <= CURVE_MAX ? formatMoney(yourGross).text : null,
    yourGross <= CURVE_MAX
      ? formatNumber(yourRate, { kind: "percent", fractionDigits: pctDigits(yourRate) }).text
      : null,
  );
  const takeHomeDigits = Number.isInteger(delta.deltaTakeHome) ? 0 : 2;
  const announcement = liveTakeHomeMessage(
    formatMoney(delta.deltaTakeHome, { fractionDigits: takeHomeDigits }).text,
  );

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
      <FormField label={EXPLORER_COPY.region}>
        {(field) => (
          <Select
            aria-describedby={field.describedBy}
            id={field.id}
            options={[
              { value: "ENGLAND_NI_WALES", label: EXPLORER_COPY.regionOptions.ENGLAND_NI_WALES },
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
              Object.keys(EXPLORER_COPY.pensionMethodOptions) as MarginalRateExplorerPensionMethod[]
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

      <CollapsibleDrawer closedLabel="" openLabel="" title={EXPLORER_COPY.moreDetails}>
        <div className={explorerDetails()}>
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
        </div>
      </CollapsibleDrawer>

      {extraPension > 0 ? (
        <SliderField
          format="currency"
          label={EXPLORER_COPY.extraPension}
          max={20_000}
          min={0}
          step={100}
          value={extraPension}
          onChange={(v) => set("extraPension", v)}
        />
      ) : (
        <Button
          className={explorerAction()}
          type="button"
          variant="secondary"
          onClick={() => {
            if (extraPension === 0) set("extraPension", 1000);
          }}
        >
          {EXPLORER_COPY.modelPension}
        </Button>
      )}
    </div>
  );

  const content = (
    <div className={explorerContent()}>
      <KpiStrip
        items={[
          <KpiCard
            key="next"
            label={EXPLORER_COPY.kpiNextThousand}
            value={<Money fractionDigits={takeHomeDigits} size="lg" value={delta.deltaTakeHome} />}
          />,
          <KpiCard
            key="rate"
            label={EXPLORER_COPY.kpiNextPound}
            value={
              <Num
                fractionDigits={pctDigits(delta.effectiveMarginalRatePct)}
                kind="percent"
                size="lg"
                value={delta.effectiveMarginalRatePct}
              />
            }
          />,
          <KpiCard
            key="year"
            label={EXPLORER_COPY.kpiTakeHome}
            value={<Money size="lg" value={delta.before.takeHome} />}
          />,
          <KpiCard
            key="tax-year"
            label={EXPLORER_COPY.kpiTaxYear}
            value={<span className={explorerNumeric()}>{delta.before.ratesYear}</span>}
          />,
        ]}
      />
      <MarginalRateChart
        headingLevel={headingLevel}
        points={points}
        steppedZones={zones}
        summary={summary}
        thresholds={thresholds}
        title={EXPLORER_COPY.chartTitle}
        yourPay={yourGross}
      />
      <TakeHomeDeltaPanel
        assumptions={pension ? pension.after.assumptions : delta.before.assumptions}
        calendarYear={context.calendarYear}
        components={delta.components}
        deltaGross={delta.deltaGross}
        headingLevel={headingLevel}
        isFallback={delta.before.isFallback}
        isUnverifiedEstimate={delta.before.isUnverifiedEstimate || delta.after.isUnverifiedEstimate}
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
        takeHome={delta.deltaTakeHome}
      />
      <LiveRegion debounceMs={800} message={announcement} visuallyHidden />
    </div>
  );

  return (
    <div className={cx(explorerRoot(), className)} data-testid="marginal-rate-explorer">
      <SimulatorSplitLayout
        content={content}
        contentLabel={EXPLORER_COPY.contentLabel}
        controls={controls}
        controlsLabel={EXPLORER_COPY.controlsLabel}
      />
    </div>
  );
};

export interface MarginalRateExplorerStandaloneProps {
  initialValues?: Partial<MarginalRateExplorerValues>;
  headingLevel?: "h2" | "h3" | "h4";
  className?: string;
}

/** Holds its own state, for signed-out pages. Nothing is saved anywhere. */
export const MarginalRateExplorerStandalone: FC<MarginalRateExplorerStandaloneProps> = ({
  initialValues,
  headingLevel,
  className,
}) => {
  const [values, setValues] = useState<MarginalRateExplorerValues>(() => ({
    ...MARGINAL_RATE_EXPLORER_DEFAULTS,
    ...initialValues,
  }));
  const onChange = useCallback<MarginalRateExplorerProps["onChange"]>((key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);
  return (
    <MarginalRateExplorer
      className={className}
      headingLevel={headingLevel}
      values={values}
      onChange={onChange}
    />
  );
};

export default MarginalRateExplorer;
