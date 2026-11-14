import {
  getUkTaxYearContext,
  isFigureKnown,
  type MissingKey,
  profileFactsFromProfile,
  selectTakeHome,
} from "@flump/finance-engine";
import {
  ButtonLink,
  CollapsibleDrawer,
  DELTA_PANEL_COPY,
  EXPLORER_COPY,
  HeroFigure,
  KpiCard,
  KpiStrip,
  Money,
  ProjectionNotice,
  ScenarioZone,
  StatusBadge,
  Tabs,
  TaxRatesStatusBanner,
} from "@repo/ui";
import { type FC, useMemo, useState } from "react";
import { Link, useInRouterContext } from "react-router";
import TaxEstimateNote from "~/components/tax/TaxEstimateNote";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { useUserProfile } from "~/hooks/useUserProfile";
import { NextPoundExplorer, useNextPoundScenario } from "../NextPoundExplorer";
import { PayRiseTool } from "../PayRiseTool";
import { TakeHomeBreakdown } from "../TakeHomeBreakdown";
import {
  calculatorRoot,
  detailHint,
  detailItem,
  detailLabel,
  detailList,
  detailNote,
  detailValue,
  zoneLink,
} from "./TakeHomeCalculator.styles";

const DEFAULT_RAISE = 5000;
const TOOLS = [
  { value: "pay-rise", label: "A pay rise" },
  { value: "next-pound", label: EXPLORER_COPY.tabNextThousand },
];
const PROFILE_HREF = "/app/profile";

/** Plain names for the facts take-home needs, for the one setup prompt. */
const MISSING_LABELS: Partial<Record<MissingKey, string>> = {
  employmentType: "employment type",
  pensionPercent: "pension contribution",
  isSalarySacrifice: "pension method",
};

const listWords = (words: string[]): string =>
  words.length <= 1
    ? (words[0] ?? "")
    : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;

export interface TakeHomeCalculatorProps {
  /** Saved salary before tax, a year; 0, null or undefined when none is saved. */
  initialSalary?: number | null;
  onApplyIncrease: (monthlyIncrease: number) => void;
}

/**
 * Take-home page body: saved salary as the hero, the take-home estimate as the first KPI,
 * "Where your pay goes" from saved figures,
 * then one ScenarioZone holding the what-ifs ("A pay rise", "The next £1,000").
 */
export const TakeHomeCalculator: FC<TakeHomeCalculatorProps> = ({
  initialSalary,
  onApplyIncrease,
}) => {
  const { profile } = useUserProfile();
  const { formatCurrency } = useFormatCurrency();
  const inRouter = useInRouterContext();
  const savedSalary = initialSalary && initialSalary > 0 ? initialSalary : 0;

  // One decision about which rates apply today. When the calendar is past the latest supported
  // year the banner says "Using {ratesYear} rates"; there is no silent fallback.
  const ratesContext = useMemo(() => getUkTaxYearContext(), []);
  const taxYear = ratesContext.ratesYear;

  // Saved figures only, through the one take-home selector every signed-in figure uses.
  const facts = useMemo(
    () => ({
      ...profileFactsFromProfile(profile),
      annualSalary: savedSalary > 0 ? savedSalary : null,
    }),
    [profile, savedSalary],
  );
  const saved = useMemo(() => selectTakeHome(facts, { taxYear }), [facts, taxYear]);

  const [salaryIncrease, setSalaryIncrease] = useState<number>(DEFAULT_RAISE);
  const [tool, setTool] = useState("pay-rise");

  const monthlyIncrease = useMemo(() => {
    if (!isFigureKnown(saved) || salaryIncrease <= 0) return 0;
    const raised = selectTakeHome(facts, {
      taxYear,
      overrides: { annualSalary: savedSalary + salaryIncrease },
    });
    return isFigureKnown(raised) ? raised.value.monthly - saved.value.monthly : 0;
  }, [saved, facts, taxYear, savedSalary, salaryIncrease]);

  // "The next £1,000" starts from the same saved figures and resets with the zone.
  const nextPound = useNextPoundScenario({
    salary: savedSalary,
    taxRegion: profile?.taxRegion,
    studentLoanPlans: profile?.studentLoanPlans,
    studentLoanPlan: profile?.studentLoanPlan,
    isSalarySacrifice: facts.isSalarySacrifice ?? false,
    pensionPercent: facts.pensionPercent ?? 0,
    taxYear,
  });

  const payRiseModified = salaryIncrease !== DEFAULT_RAISE;
  const resetScenario = () => {
    nextPound.reset();
    setSalaryIncrease(DEFAULT_RAISE);
  };

  const profileLink = (label: string, variant: "primary" | "link") =>
    variant === "primary" ? (
      inRouter ? (
        <ButtonLink asChild>
          <Link to={PROFILE_HREF}>{label}</Link>
        </ButtonLink>
      ) : (
        <ButtonLink href={PROFILE_HREF}>{label}</ButtonLink>
      )
    ) : inRouter ? (
      <Link className={zoneLink()} to={PROFILE_HREF}>
        {label}
      </Link>
    ) : (
      <a className={zoneLink()} href={PROFILE_HREF}>
        {label}
      </a>
    );

  const salaryHero = (
    <HeroFigure
      emptyAction={profileLink("Add salary", "primary")}
      emptyPrompt="Add your salary before tax to see an estimate of your take-home pay."
      label="Salary before tax"
      subline={savedSalary > 0 ? `${formatCurrency(savedSalary / 12)} a month` : undefined}
      value={savedSalary > 0 ? savedSalary : undefined}
      valueFormat={{ fractionDigits: 0 }}
    />
  );
  const estimateBadge = <StatusBadge variant="neutral">Estimate</StatusBadge>;

  if (!isFigureKnown(saved)) {
    // The hero holds the saved fact; with no salary it is the page's one setup prompt. With a
    // salary but other facts missing, the estimate card says what to add. No breakdown, no zone,
    // never a £0 figure (P3, P12.2).
    if (saved.missing.includes("annualSalary")) {
      return <div className={calculatorRoot()}>{salaryHero}</div>;
    }
    const others = listWords(saved.missing.flatMap((key) => MISSING_LABELS[key] ?? []));
    return (
      <div className={calculatorRoot()}>
        {salaryHero}
        <KpiStrip
          emptyPrompt={{
            title: others
              ? `Add your ${others} to see an estimate of your take-home pay`
              : "Take-home pay cannot be worked out for this tax year yet",
            action: others ? profileLink("Add your details", "link") : undefined,
          }}
          items={[
            <KpiCard
              key="take-home"
              action={estimateBadge}
              label="Monthly take-home"
              value={null}
            />,
          ]}
        />
      </div>
    );
  }

  const v = saved.value;
  const salary = savedSalary;
  const shareNotTakenHome = salary > 0 ? Math.round(((salary - v.annual) / salary) * 100) : 0;
  const payAfterPension = Math.max(0, salary - v.pension);

  const details = (
    <CollapsibleDrawer title="Show details" variant="quiet">
      <dl className={detailList()}>
        <div className={detailItem()}>
          <dt className={detailLabel()}>Share of pay not taken home</dt>
          <dd className={detailValue()}>{`${shareNotTakenHome}%`}</dd>
          <dd className={detailHint()}>
            Tax, National Insurance, pension and student loan as a share of pay before tax
          </dd>
        </div>
        <div className={detailItem()}>
          <dt className={detailLabel()}>Pay after pension, before tax</dt>
          <dd className={detailValue()}>
            <Money size="md" value={payAfterPension} />
          </dd>
          <dd className={detailHint()}>Your salary before tax, less your pension contribution</dd>
        </div>
      </dl>
      <TaxEstimateNote className={detailNote()} taxYear={taxYear} />
      {saved.assumptions?.map((a) => (
        <p key={a} className={detailNote()}>
          {a}
        </p>
      ))}
    </CollapsibleDrawer>
  );

  return (
    <div className={calculatorRoot()}>
      <TaxRatesStatusBanner {...ratesContext} />

      {salaryHero}

      {/* The estimate is the first KPI, never the hero (ruling 7). */}
      <KpiStrip
        items={[
          <KpiCard
            key="take-home"
            action={estimateBadge}
            label="Monthly take-home"
            subtext="After tax, National Insurance, pension and student loan"
            value={v.monthly}
            valueFormat={{ fractionDigits: 0 }}
          />,
        ]}
      />

      <TakeHomeBreakdown
        details={details}
        incomeTax={v.incomeTax}
        nationalInsurance={v.nationalInsurance}
        pension={v.pension}
        salary={salary}
        studentLoan={v.studentLoan}
      />

      <ScenarioZone
        announcement={
          payRiseModified && tool === "pay-rise"
            ? `estimated change in take-home pay ${formatCurrency(monthlyIncrease)} a month`
            : undefined
        }
        basis="Starting from your saved salary, pension and student loan."
        footer={profileLink("Update your details", "link")}
        id="scenario-zone"
        isModified={payRiseModified || nextPound.isModified}
        notice={<ProjectionNotice lead={DELTA_PANEL_COPY.unverifiedBanner} />}
        title="Model a change to your pay"
        onReset={resetScenario}
      >
        {/* Real tab panels; only the active one is mounted, so the explorer's curve is not worked out until opened. */}
        <Tabs
          aria-label={EXPLORER_COPY.tabsLabel}
          items={TOOLS}
          size="sm"
          value={tool}
          onValueChange={setTool}
        >
          <Tabs.Panel value="pay-rise">
            <PayRiseTool
              monthlyIncrease={monthlyIncrease}
              salaryIncrease={salaryIncrease}
              onApplyIncrease={onApplyIncrease}
              onSalaryIncreaseChange={setSalaryIncrease}
            />
          </Tabs.Panel>
          <Tabs.Panel value="next-pound">
            <NextPoundExplorer scenario={nextPound} unverifiedInPageNotice />
          </Tabs.Panel>
        </Tabs>
      </ScenarioZone>
    </div>
  );
};

export default TakeHomeCalculator;
