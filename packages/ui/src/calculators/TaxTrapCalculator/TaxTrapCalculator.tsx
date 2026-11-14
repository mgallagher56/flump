import {
  getUkTaxYearContext,
  getUkTaxYearRules,
  persistOnboardingSeed,
  SUPPORTED_UK_TAX_YEARS,
  type UkIncomeScenario,
  type UkTaxYear,
  whatIfGrossChange,
  whatIfSacrificeChange,
} from "@flump/finance-engine";
import { ArrowRight } from "lucide-react";
import type { FC } from "react";
import { useMemo, useState } from "react";
import { SimulatorSplitLayout } from "../../patterns/SimulatorSplitLayout/SimulatorSplitLayout";
import {
  ASSUMPTION_COPY,
  type AssumptionCode,
  asAtTaxYear,
  DELTA_PANEL_COPY,
  pensionPreviewSentence,
} from "../../patterns/TakeHomeDeltaPanel/copy";
import { TaxRatesStatusBanner } from "../../patterns/TaxRatesStatusBanner/TaxRatesStatusBanner";
import { Button } from "../../primitives/Button/Button";
import { FormField } from "../../primitives/FormField/FormField";
import { Icon } from "../../primitives/Icon";
import { KpiCard } from "../../primitives/KpiCard/KpiCard";
import { LiveRegion } from "../../primitives/LiveRegion/LiveRegion";
import { formatMoney, formatNumber, Money } from "../../primitives/Money/Money";
import { Select } from "../../primitives/Select/Select";
import { SliderField } from "../../primitives/SliderField/SliderField";
import { StatusBadge } from "../../primitives/StatusBadge/StatusBadge";
import { Table, TBody, Td, THead, Th, Tr } from "../../primitives/Table/Table";
import { childcareStatus, TAX_TRAP_COPY, TAX_TRAP_DEFAULT_CTA, taperRange } from "./copy";
import {
  taxTrapAssumptions,
  taxTrapBadges,
  taxTrapContent,
  taxTrapControls,
  taxTrapCta,
  taxTrapHeader,
  taxTrapIntro,
  taxTrapLink,
  taxTrapNote,
  taxTrapOutcomes,
  taxTrapRoot,
  taxTrapSectionTitle,
  taxTrapTitle,
  taxTrapUnverified,
} from "./TaxTrapCalculator.styles";

export type TaxTrapRegion = "ENGLAND_NI_WALES" | "SCOTLAND";

export interface TaxTrapCalculatorProps {
  onSaveAndContinue?: (payload: TaxTrapSeedPayload) => void;
  ctaText?: string;
  /** When false, entered figures are not written to the onboarding seed in local storage. Default true. */
  persistSeed?: boolean;
  /** Tax year whose rates are used. Defaults to the year the engine says applies today. */
  taxYear?: string;
  /** Starting values (examples, not anyone's saved figures). */
  initialGrossIncome?: number;
  initialContribution?: number;
  initialRegion?: TaxTrapRegion;
}

/** What the CTA pre-fills for sign-up. Only the figure the visitor entered; nothing invented. */
export interface TaxTrapSeedPayload {
  annualIncome: number;
  inferredModules: string[];
  timestamp: number;
}

const GROSS_MAX = 200_000;
const CONTRIBUTION_MAX = 60_000;
const CHILDCARE_LIMIT = 100_000;
const NEXT = 1000;
const CHILDCARE_URL = "https://www.gov.uk/tax-free-childcare";

const resolveYear = (year: string | undefined): UkTaxYear =>
  year && (SUPPORTED_UK_TAX_YEARS as readonly string[]).includes(year)
    ? (year as UkTaxYear)
    : getUkTaxYearContext().ratesYear;

const pctDigits = (n: number) => (Number.isInteger(n) ? 0 : 1);
const money = (n: number) => formatMoney(n).text;
const pct = (n: number) => formatNumber(n, { kind: "percent", fractionDigits: pctDigits(n) }).text;

/**
 * Signed-out tool for the Personal Allowance taper. Every figure comes from the engine's
 * `whatIfSacrificeChange` and `whatIfGrossChange`; this component holds no tax rates of its own.
 */
export const TaxTrapCalculator: FC<TaxTrapCalculatorProps> = ({
  onSaveAndContinue,
  ctaText = TAX_TRAP_DEFAULT_CTA,
  persistSeed = true,
  taxYear,
  initialGrossIncome = 115_000,
  initialContribution = 10_000,
  initialRegion = "ENGLAND_NI_WALES",
}) => {
  const [grossIncome, setGrossIncome] = useState(initialGrossIncome);
  const [contribution, setContribution] = useState(initialContribution);
  const [region, setRegion] = useState<TaxTrapRegion>(initialRegion);

  const context = useMemo(() => getUkTaxYearContext(), []);
  const year = resolveYear(taxYear);
  const rules = useMemo(() => getUkTaxYearRules(year), [year]);

  const maxContribution = Math.min(CONTRIBUTION_MAX, Math.max(0, grossIncome));
  const sacrifice = Math.min(contribution, maxContribution);

  const scenario = useMemo<UkIncomeScenario>(
    () => ({ taxYear: year, region, salary: Math.max(0, grossIncome) }),
    [year, region, grossIncome],
  );
  const change = useMemo(() => whatIfSacrificeChange(scenario, sacrifice), [scenario, sacrifice]);
  const nextBefore = useMemo(() => whatIfGrossChange(scenario, NEXT), [scenario]);
  const nextAfter = useMemo(
    () =>
      whatIfGrossChange(
        { ...scenario, pension: { method: "salary-sacrifice", amount: sacrifice } },
        NEXT,
      ),
    [scenario, sacrifice],
  );

  const { before, after } = change;
  const taxAndNi = change.components.incomeTax + change.components.nationalInsurance;
  const unverified = before.isUnverifiedEstimate || after.isUnverifiedEstimate;
  const childcareOver = after.adjustedNetIncome > CHILDCARE_LIMIT;
  const assumptions = after.assumptions.filter(
    (a): a is { code: AssumptionCode; unverified: boolean } =>
      Object.hasOwn(ASSUMPTION_COPY, a.code),
  );

  const announcement =
    sacrifice > 0
      ? pensionPreviewSentence(
          money(sacrifice),
          money(-change.deltaTakeHome),
          money(change.deltaPensionGross),
        )
      : "";

  const handleSave = () => {
    const payload: TaxTrapSeedPayload = {
      annualIncome: grossIncome,
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

  const controls = (
    <div className={taxTrapControls()}>
      <SliderField
        format="currency"
        label={TAX_TRAP_COPY.grossIncome}
        max={GROSS_MAX}
        min={0}
        step={500}
        value={grossIncome}
        onChange={setGrossIncome}
      />
      <SliderField
        format="currency"
        helperText={TAX_TRAP_COPY.contributionHelp}
        label={TAX_TRAP_COPY.contribution}
        max={maxContribution}
        min={0}
        step={500}
        value={sacrifice}
        onChange={setContribution}
      />
      <FormField label={TAX_TRAP_COPY.region}>
        {(field) => (
          <Select
            aria-describedby={field.describedBy}
            id={field.id}
            options={[
              { value: "ENGLAND_NI_WALES", label: TAX_TRAP_COPY.regionOptions.ENGLAND_NI_WALES },
              { value: "SCOTLAND", label: TAX_TRAP_COPY.regionOptions.SCOTLAND },
            ]}
            value={region}
            onChange={(e) => setRegion(e.target.value as TaxTrapRegion)}
          />
        )}
      </FormField>
    </div>
  );

  const factRows: { label: string; before: string; after: string }[] = [
    {
      label: TAX_TRAP_COPY.factAdjustedNetIncome,
      before: money(before.adjustedNetIncome),
      after: money(after.adjustedNetIncome),
    },
    {
      label: TAX_TRAP_COPY.factPersonalAllowance,
      before: money(before.personalAllowance),
      after: money(after.personalAllowance),
    },
    {
      label: TAX_TRAP_COPY.factTakeHome,
      before: money(before.takeHome),
      after: money(after.takeHome),
    },
    {
      label: TAX_TRAP_COPY.factNextThousand,
      before: pct(nextBefore.effectiveMarginalRatePct),
      after: pct(nextAfter.effectiveMarginalRatePct),
    },
  ];

  const content = (
    <div className={taxTrapContent()}>
      <TaxRatesStatusBanner
        calendarYear={context.calendarYear}
        isFallback={before.isFallback}
        ratesYear={before.ratesYear}
      />
      {unverified ? (
        <p className={taxTrapUnverified()} data-testid="tax-trap-unverified">
          {DELTA_PANEL_COPY.unverifiedBanner}
        </p>
      ) : null}
      {/* Illustration outcomes, not saved figures, so plain outcome cards rather than a KpiStrip. */}
      <div className={taxTrapOutcomes()} data-density="compact" data-testid="tax-trap-outcomes">
        <KpiCard
          label={TAX_TRAP_COPY.kpiReachesPension}
          value={<Money size="lg" value={change.deltaPensionGross} />}
        />
        <KpiCard
          label={TAX_TRAP_COPY.kpiTakeHome}
          value={<Money signDisplay="exceptZero" size="lg" value={change.deltaTakeHome} />}
        />
        <KpiCard
          label={TAX_TRAP_COPY.kpiTaxAndNi}
          value={<Money signDisplay="exceptZero" size="lg" value={taxAndNi} />}
        />
        <KpiCard
          label={TAX_TRAP_COPY.kpiAllowance}
          value={<Money size="lg" value={after.personalAllowance} />}
        />
      </div>

      <Table caption={TAX_TRAP_COPY.factsCaption}>
        <THead>
          <Tr>
            <Th scope="col">{TAX_TRAP_COPY.factColumn}</Th>
            <Th numeric scope="col">
              {TAX_TRAP_COPY.beforeColumn}
            </Th>
            <Th numeric scope="col">
              {TAX_TRAP_COPY.afterColumn}
            </Th>
          </Tr>
        </THead>
        <TBody>
          {factRows.map((row) => (
            <Tr key={row.label}>
              <Th scope="row">{row.label}</Th>
              <Td label={TAX_TRAP_COPY.beforeColumn} numeric>
                {row.before}
              </Td>
              <Td label={TAX_TRAP_COPY.afterColumn} numeric>
                {row.after}
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>

      <p className={taxTrapNote()} data-testid="tax-trap-taper-note">
        {TAX_TRAP_COPY.taperNote}{" "}
        {taperRange(money(rules.ewni.personalAllowanceTaperStart), money(rules.taperEnd))}
      </p>

      <section aria-labelledby="tax-trap-childcare" className={taxTrapNote()}>
        <h3 className={taxTrapSectionTitle()} id="tax-trap-childcare">
          {TAX_TRAP_COPY.childcareHeading}
        </h3>
        <p data-testid="tax-trap-childcare-status">
          {childcareStatus(money(after.adjustedNetIncome), childcareOver)}
        </p>
        <p>
          {TAX_TRAP_COPY.childcareNote}{" "}
          <a className={taxTrapLink()} href={CHILDCARE_URL} rel="noreferrer" target="_blank">
            {TAX_TRAP_COPY.childcareSource}
          </a>
        </p>
      </section>

      {assumptions.length > 0 ? (
        <section aria-labelledby="tax-trap-assumptions" className={taxTrapAssumptions()}>
          <h3 className={taxTrapSectionTitle()} id="tax-trap-assumptions">
            {TAX_TRAP_COPY.assumptionsHeading}
          </h3>
          <ul>
            {assumptions.map((a) => (
              <li key={a.code}>
                {ASSUMPTION_COPY[a.code]}
                {a.unverified ? ` ${DELTA_PANEL_COPY.notConfirmed}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <LiveRegion debounceMs={1000} message={announcement} visuallyHidden />
    </div>
  );

  return (
    <div className={taxTrapRoot()} data-testid="tax-trap-calculator-tool">
      <div className={taxTrapHeader()}>
        <div className={taxTrapBadges()}>
          <StatusBadge variant="neutral">{asAtTaxYear(before.ratesYear)}</StatusBadge>
          <StatusBadge variant={unverified ? "warning" : "info"}>
            {unverified ? TAX_TRAP_COPY.unverifiedBadge : DELTA_PANEL_COPY.estimateBadge}
          </StatusBadge>
        </div>
        <h2 className={taxTrapTitle()}>{TAX_TRAP_COPY.title}</h2>
        <p className={taxTrapIntro()}>{TAX_TRAP_COPY.intro}</p>
      </div>

      <SimulatorSplitLayout
        content={content}
        contentLabel={TAX_TRAP_COPY.contentLabel}
        controls={controls}
        controlsLabel={TAX_TRAP_COPY.controlsLabel}
      />

      <Button className={taxTrapCta()} size="md" variant="primary" onClick={handleSave}>
        {ctaText} <Icon icon={ArrowRight} size="sm" />
      </Button>
    </div>
  );
};

export default TaxTrapCalculator;
