import { getUkTaxYearContext, UK_STUDENT_LOANS } from "@flump/finance-engine";
import {
  Card,
  EXPLORER_COPY,
  KpiCard,
  KpiStrip,
  Money,
  Num,
  ScenarioZone,
  SegmentedTabs,
  SimulatorSplitLayout,
  TaxRatesStatusBanner,
} from "@repo/ui";
import { type FC, useEffect, useMemo, useState } from "react";
import { Link, useInRouterContext } from "react-router";
import TaxDisclaimerButton from "~/components/core/dialogs/TaxDisclaimerButton";
import TaxEstimateNote from "~/components/tax/TaxEstimateNote";
import { NotSet } from "~/features/feedback/components/NotSet";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { useUserProfile } from "~/hooks/useUserProfile";
import { calculateUKTax } from "../../calculateUKTax";
import { NextPoundExplorer, useNextPoundScenario } from "../NextPoundExplorer";
import { PayRiseCard } from "../PayRiseCard";
import { TakeHomeBreakdown } from "../TakeHomeBreakdown";
import { TakeHomeInputs } from "../TakeHomeInputs";
import {
  calculatorRoot,
  emptyResults,
  estimateNote,
  footer,
  heroSubtext,
  resultsStack,
  section,
  sectionTitle,
  zoneLink,
} from "./TakeHomeCalculator.styles";

const DEFAULT_PENSION_PERCENT = 5;
const DEFAULT_RAISE = 5000;
const TOOLS = [
  { value: "take-home", label: EXPLORER_COPY.tabYourTakeHome },
  { value: "next-pound", label: EXPLORER_COPY.tabNextThousand },
];

export interface TakeHomeCalculatorProps {
  initialSalary?: number | null;
  onApplyIncrease: (monthlyIncrease: number) => void;
}

/** One hero for monthly take-home, a "Where you stand" strip, then inputs beside the breakdown. */
export const TakeHomeCalculator: FC<TakeHomeCalculatorProps> = ({
  initialSalary,
  onApplyIncrease,
}) => {
  const { profile } = useUserProfile();
  const { formatCurrency, formatCurrencyDecimal } = useFormatCurrency();
  const inRouter = useInRouterContext();
  // Saved figures: the headline reads these only. The scenario below starts from them.
  const savedSalary = initialSalary && initialSalary > 0 ? initialSalary : 0;
  // The method the user saved; when never chosen, net pay, as the dashboard and budget use.
  const savedSacrifice = profile?.isSalarySacrifice ?? false;
  const savedEmployerNi = profile?.isSalarySacrificeEmployerNi ?? false;
  const savedPension =
    typeof profile?.pensionPercent === "number" && Number.isFinite(profile.pensionPercent)
      ? profile.pensionPercent
      : DEFAULT_PENSION_PERCENT;
  // No invented salary: until one is known (or typed in) the results render "Not set".
  const [grossSalary, setGrossSalary] = useState<number>(
    initialSalary && initialSalary > 0 ? initialSalary : 0,
  );
  const salaryKnown = grossSalary > 0;
  // A cleared or invalid entry is ignored, so the last valid salary and its results stay on screen.
  const updateSalary = (value: number) => {
    if (Number.isFinite(value) && value > 0) setGrossSalary(value);
  };
  const [pensionPercent, setPensionPercent] = useState<number>(savedPension);
  const [isSalarySacrifice, setIsSalarySacrifice] = useState<boolean>(savedSacrifice);
  const [isSalarySacrificeEmployerNi, setIsSalarySacrificeEmployerNi] =
    useState<boolean>(savedEmployerNi);
  const [studentLoanPlan, setStudentLoanPlan] = useState<string>("none");
  const [salaryIncrease, setSalaryIncrease] = useState<number>(DEFAULT_RAISE);

  // One decision about which rates apply today. When the calendar is past the latest supported
  // year the banner below says "Using {ratesYear} rates"; there is no silent fallback.
  const ratesContext = useMemo(() => getUkTaxYearContext(), []);
  const taxYear = ratesContext.ratesYear;
  const studentLoanPlans = useMemo(
    () =>
      Object.entries(UK_STUDENT_LOANS[taxYear].plans).map(([key, plan]) => ({
        key,
        name: plan.name,
        threshold: plan.threshold,
      })),
    [taxYear],
  );

  // Sync initialSalary from profile when loaded
  useEffect(() => {
    if (initialSalary) setGrossSalary(initialSalary);
  }, [initialSalary]);

  const taxResults = useMemo(
    () =>
      calculateUKTax(
        grossSalary,
        pensionPercent,
        studentLoanPlan,
        taxYear,
        isSalarySacrifice,
        isSalarySacrificeEmployerNi,
      ),
    [
      grossSalary,
      pensionPercent,
      studentLoanPlan,
      taxYear,
      isSalarySacrifice,
      isSalarySacrificeEmployerNi,
    ],
  );

  // Hypothetical salary with the raise
  const raiseResults = useMemo(
    () =>
      calculateUKTax(
        grossSalary + salaryIncrease,
        pensionPercent,
        studentLoanPlan,
        taxYear,
        isSalarySacrifice,
        isSalarySacrificeEmployerNi,
      ),
    [
      grossSalary,
      salaryIncrease,
      pensionPercent,
      studentLoanPlan,
      taxYear,
      isSalarySacrifice,
      isSalarySacrificeEmployerNi,
    ],
  );

  const monthlyIncrease = useMemo(() => {
    const netCurrent = taxResults.netPay / 12;
    const netNew = raiseResults.netPay / 12;
    return Math.max(0, netNew - netCurrent);
  }, [taxResults, raiseResults]);

  // The headline reads saved figures only, never the scenario inputs.
  const savedResults = useMemo(
    () =>
      calculateUKTax(savedSalary, savedPension, "none", taxYear, savedSacrifice, savedEmployerNi),
    [savedSalary, savedPension, taxYear, savedSacrifice, savedEmployerNi],
  );
  const savedKnown = savedSalary > 0;
  const effectiveRate = savedKnown
    ? Math.round(((savedSalary - savedResults.netPay) / savedSalary) * 100)
    : 0;

  const isModified =
    grossSalary !== savedSalary ||
    pensionPercent !== savedPension ||
    isSalarySacrifice !== savedSacrifice ||
    isSalarySacrificeEmployerNi !== savedEmployerNi ||
    studentLoanPlan !== "none" ||
    salaryIncrease !== DEFAULT_RAISE;
  const [tool, setTool] = useState("take-home");
  // "The next £1,000" starts from the same saved figures and resets with the zone.
  const nextPound = useNextPoundScenario({
    salary: savedSalary,
    taxRegion: profile?.taxRegion,
    studentLoanPlans: profile?.studentLoanPlans,
    studentLoanPlan: profile?.studentLoanPlan,
    isSalarySacrifice: savedSacrifice,
    pensionPercent: savedPension,
    taxYear,
  });
  const resetScenario = () => {
    nextPound.reset();
    setGrossSalary(savedSalary);
    setPensionPercent(savedPension);
    setIsSalarySacrifice(savedSacrifice);
    setIsSalarySacrificeEmployerNi(savedEmployerNi);
    setStudentLoanPlan("none");
    setSalaryIncrease(DEFAULT_RAISE);
  };

  const controls = (
    <TakeHomeInputs
      grossSalary={grossSalary}
      isSalarySacrifice={isSalarySacrifice}
      isSalarySacrificeEmployerNi={isSalarySacrificeEmployerNi}
      pensionPercent={pensionPercent}
      studentLoanPlan={studentLoanPlan}
      studentLoanPlans={studentLoanPlans}
      onEmployerNiChange={setIsSalarySacrificeEmployerNi}
      onGrossSalaryChange={updateSalary}
      onPensionPercentChange={setPensionPercent}
      onSalarySacrificeChange={(checked) => {
        setIsSalarySacrifice(checked);
        if (!checked) setIsSalarySacrificeEmployerNi(false);
      }}
      onStudentLoanPlanChange={setStudentLoanPlan}
    />
  );

  const content = salaryKnown ? (
    <div className={resultsStack()}>
      <TakeHomeBreakdown
        grossSalary={grossSalary}
        isSalarySacrifice={isSalarySacrifice}
        results={taxResults}
      />
      <PayRiseCard
        monthlyIncrease={monthlyIncrease}
        salaryIncrease={salaryIncrease}
        onApplyIncrease={onApplyIncrease}
        onSalaryIncreaseChange={setSalaryIncrease}
      />
    </div>
  ) : (
    <Card padding="lg">
      <p className={emptyResults()}>Add your gross salary to see your take-home pay.</p>
    </Card>
  );

  return (
    <div className={calculatorRoot()}>
      <TaxRatesStatusBanner {...ratesContext} />

      {savedKnown ? (
        <>
          <KpiCard
            label="Estimated monthly take-home"
            subtext={
              <span className={heroSubtext()}>
                <Money size="sm" tone="onContrast" value={savedResults.netPay} />
                <span>a year after tax, National Insurance and pension</span>
              </span>
            }
            tone="hero"
            value={savedResults.netPay / 12}
            valueFormat={{ fractionDigits: 2 }}
          />
          <TaxEstimateNote className={estimateNote()} taxYear={taxYear} />

          <section aria-labelledby="take-home-stand-heading" className={section()}>
            <h2 className={sectionTitle()} id="take-home-stand-heading">
              Where you stand
            </h2>
            <KpiStrip columns={4}>
              <KpiCard
                label="Weekly take-home"
                subtext="Across 52 weeks"
                value={<Money fractionDigits={2} size="lg" value={savedResults.netPay / 52} />}
              />
              <KpiCard
                label="Daily take-home"
                subtext="Across a five-day week"
                value={<Money fractionDigits={2} size="lg" value={savedResults.netPay / 260} />}
              />
              <KpiCard
                label="Effective tax rate"
                subtext="Share of gross pay not taken home"
                value={<Num fractionDigits={0} kind="percent" size="lg" value={effectiveRate} />}
              />
              <KpiCard
                label="Qualifying gross"
                subtext="Gross pay after pension"
                value={<Money size="lg" value={savedResults.adjustedGross} />}
              />
            </KpiStrip>
          </section>
        </>
      ) : (
        <KpiCard
          label="Estimated monthly take-home"
          value={<NotSet href="/app/profile" subject="salary" />}
        />
      )}

      <ScenarioZone
        announcement={
          isModified && salaryKnown
            ? `estimated monthly take-home ${formatCurrencyDecimal(taxResults.netPay / 12)}`
            : undefined
        }
        basis={
          tool === "next-pound" && !savedKnown
            ? EXPLORER_COPY.defaultBasis
            : savedKnown
              ? `Starting from your figures: ${formatCurrency(savedSalary)} gross salary, ${savedPension}% pension`
              : "Starting from your figures: no saved salary yet"
        }
        footer={
          inRouter ? (
            <Link className={zoneLink()} to="/app/profile">
              Update your details
            </Link>
          ) : (
            <a className={zoneLink()} href="/app/profile">
              Update your details
            </a>
          )
        }
        isModified={isModified || nextPound.isModified}
        title="Model a change to your pay"
        onReset={resetScenario}
      >
        {/* Real tab panels; only the active one is mounted, so the explorer's curve is not worked out until opened. */}
        <SegmentedTabs
          aria-label={EXPLORER_COPY.tabsLabel}
          items={TOOLS}
          value={tool}
          onValueChange={setTool}
        >
          <SegmentedTabs.Panel value="take-home">
            <SimulatorSplitLayout
              content={content}
              contentLabel="Illustration results"
              controls={controls}
              controlsLabel="Illustration inputs"
            />
          </SegmentedTabs.Panel>
          <SegmentedTabs.Panel value="next-pound">
            <NextPoundExplorer scenario={nextPound} />
          </SegmentedTabs.Panel>
        </SegmentedTabs>
      </ScenarioZone>

      <div className={footer()}>
        <TaxDisclaimerButton showShortText />
      </div>
    </div>
  );
};

export default TakeHomeCalculator;
