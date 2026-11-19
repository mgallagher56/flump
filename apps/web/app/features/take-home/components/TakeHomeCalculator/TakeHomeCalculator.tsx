import {
  getUkTaxYearContext,
  isFigureKnown,
  type MissingKey,
  profileFactsFromProfile,
  selectTakeHome,
} from "@flump/finance-engine";
import {
  ButtonLink,
  DELTA_PANEL_COPY,
  EXPLORER_COPY,
  HeroFigure,
  KpiCard,
  KpiStrip,
  Money,
  ProjectionNotice,
  ScenarioZone,
  Tabs,
  TaxRatesStatusBanner,
} from "@repo/ui";
import { type FC, useMemo, useState } from "react";
import { Link, useInRouterContext } from "react-router";
import TaxEstimateNote from "~/components/tax/TaxEstimateNote";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { DEFAULT_PROFILE, type UserProfile, useUserProfile } from "~/hooks/useUserProfile";
import { NextPoundExplorer, useNextPoundScenario } from "../NextPoundExplorer";
import { PayRiseTool } from "../PayRiseTool";
import { monthlyPayParts, TakeHomeBreakdown } from "../TakeHomeBreakdown";
import {
  calculatorRoot,
  detailHint,
  detailItem,
  detailLabel,
  detailList,
  detailNote,
  detailValue,
  payStrip,
  zoneLink,
} from "./TakeHomeCalculator.styles";

const DEFAULT_RAISE = 5000;
const TOOLS = [
  { value: "pay-rise", label: "A pay rise" },
  { value: "next-pound", label: EXPLORER_COPY.tabNextThousand },
];
const PROFILE_HREF = "/app/profile";
/** Salary lives in the age and pay section of the Profile tab. */
const SALARY_HREF = "/app/profile#settings-age-and-pay";

/** Plain names for the facts take-home needs, for the one setup prompt. */
const MISSING_LABELS: Partial<Record<MissingKey, string>> = {
  employmentType: "employment type",
  pensionPercent: "pension contribution",
  isSalarySacrifice: "pension method",
};

/** en-GB whole-number percentage, e.g. 0.234 to "23%". */
const percentFormat = new Intl.NumberFormat("en-GB", {
  style: "percent",
  maximumFractionDigits: 0,
});

const listWords = (words: string[]): string =>
  words.length <= 1
    ? (words[0] ?? "")
    : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;

export interface TakeHomeCalculatorProps {
  /** Saved salary before tax, a year; 0, null or undefined when none is saved. */
  initialSalary?: number | null;
  /**
   * The saved profile, as the page has it on its first render (the loader's row). Without it the
   * calculator reads the shared profile store, which the page fills only after its first render,
   * so the strip, breakdown and zone changed size once it arrived (phone audit P61).
   */
  profile?: UserProfile | null;
  onApplyIncrease: (monthlyIncrease: number) => void;
}

/**
 * Take-home page body: the estimated monthly take-home pay as the hero, labelled "Unverified
 * estimate" inside it (owner ruling 2026-11-15: a calculator-style page leads with the answer it
 * exists to give), the saved pay before tax and what comes off it in the strip, every part of the
 * pay behind one quiet "Show details",
 * then one ScenarioZone holding the what-ifs ("A pay rise", "The next £1,000").
 */
export const TakeHomeCalculator: FC<TakeHomeCalculatorProps> = ({
  initialSalary,
  profile: savedProfile,
  onApplyIncrease,
}) => {
  const { profile: storeProfile } = useUserProfile();
  // The store starts as DEFAULT_PROFILE until the loader fills it: read the saved row until then
  // (no layout shift on the first render, P61), and the live store after (fresh after edits).
  const profile = storeProfile !== DEFAULT_PROFILE ? storeProfile : (savedProfile ?? storeProfile);
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
    // The same value selectTakeHome uses: salary sacrifice is a payroll arrangement, so it is off
    // for self-employed people, and the explorer starts from the same take-home as the KPI.
    isSalarySacrifice:
      facts.employmentType === "self-employed" ? false : facts.isSalarySacrifice === true,
    pensionPercent: facts.pensionPercent ?? 0,
    taxYear,
  });

  const payRiseModified = salaryIncrease !== DEFAULT_RAISE;
  const resetScenario = () => {
    nextPound.reset();
    setSalaryIncrease(DEFAULT_RAISE);
  };

  const profileLink = (label: string, variant: "primary" | "link", href = PROFILE_HREF) =>
    variant === "primary" ? (
      inRouter ? (
        <ButtonLink asChild>
          <Link to={href}>{label}</Link>
        </ButtonLink>
      ) : (
        <ButtonLink href={href}>{label}</ButtonLink>
      )
    ) : inRouter ? (
      <Link className={zoneLink()} to={href}>
        {label}
      </Link>
    ) : (
      <a className={zoneLink()} href={href}>
        {label}
      </a>
    );

  const heroLabel = "Monthly take-home pay";
  const salaryCard = (
    <KpiCard
      key="salary"
      label="Salary before tax"
      subtext="A year"
      value={savedSalary > 0 ? savedSalary : null}
      valueFormat={{ fractionDigits: 0 }}
    />
  );

  if (!isFigureKnown(saved)) {
    // No estimate can be worked out, so the hero is the page's one setup prompt: with no salary it
    // asks for one; with a salary but other facts missing it says what to add, and the saved
    // salary shows beneath. No breakdown, no zone, never a £0 figure (P3, P12.2).
    if (saved.missing.includes("annualSalary")) {
      return (
        <div className={calculatorRoot()}>
          <HeroFigure
            emptyAction={profileLink("Add salary", "primary", SALARY_HREF)}
            emptyPrompt="Add your salary before tax to see an estimate of your take-home pay."
            label={heroLabel}
            value={undefined}
          />
        </div>
      );
    }
    const others = listWords(saved.missing.flatMap((key) => MISSING_LABELS[key] ?? []));
    return (
      <div className={calculatorRoot()}>
        <HeroFigure
          emptyAction={others ? profileLink("Add your details", "primary") : undefined}
          emptyPrompt={
            others
              ? `Add your ${others} to see an estimate of your take-home pay.`
              : "Take-home pay cannot be worked out for this tax year yet."
          }
          label={heroLabel}
          value={undefined}
        />
        <KpiStrip items={[salaryCard]} />
      </div>
    );
  }

  const v = saved.value;
  const salary = savedSalary;
  const shareNotTakenHome = salary > 0 ? (salary - v.annual) / salary : 0;
  const payAfterPension = Math.max(0, salary - v.pension);
  const parts = monthlyPayParts({
    salary,
    incomeTax: v.incomeTax,
    nationalInsurance: v.nationalInsurance,
    pension: v.pension,
    studentLoan: v.studentLoan,
    takeHome: v.annual,
  });
  const pensionAndLoan = parts.pension + parts.studentLoan;

  // The hero is the answer: the estimated monthly take-home pay, marked as an estimate inside the
  // hero. The strip is the saved pay before tax, a month, then what comes off in two cards, so
  // the strip's first card less the other two is the hero (to within the pound or two of rounding
  // that `monthlyPayParts` moves into the largest part). With no pension or student loan the
  // second and third are Income Tax and National Insurance, so the strip stays three cards; a
  // part that is nothing reads "None", never £0.
  const takeHomeHero = (
    <HeroFigure
      estimateLabel={DELTA_PANEL_COPY.unverifiedBadge}
      explain={`Your saved salary before tax, less Income Tax, National Insurance, pension and student loan, at ${taxYear} rates.`}
      label={heroLabel}
      subline="After tax and deductions"
      value={parts.takeHome}
      valueFormat={{ fractionDigits: 0 }}
    />
  );
  const payBeforeTaxCard = (
    <KpiCard
      key="pay-before-tax"
      label="Monthly pay before tax"
      subtext="Your saved salary, a month"
      value={Math.round(salary / 12)}
      valueFormat={{ fractionDigits: 0 }}
    />
  );
  const secondCard =
    pensionAndLoan > 0 ? (
      <KpiCard
        key="tax"
        label="Tax and National Insurance"
        value={parts.incomeTax + parts.nationalInsurance}
        valueFormat={{ fractionDigits: 0 }}
      />
    ) : (
      <KpiCard
        key="income-tax"
        label="Income Tax"
        notSetLabel="None"
        value={parts.incomeTax > 0 ? parts.incomeTax : null}
        valueFormat={{ fractionDigits: 0 }}
      />
    );
  const pensionLabel =
    parts.pension > 0 && parts.studentLoan > 0
      ? "Pension and student loan"
      : parts.pension > 0
        ? "Pension"
        : "Student loan";
  const thirdCard =
    pensionAndLoan > 0 ? (
      <KpiCard
        key="pension"
        label={pensionLabel}
        value={pensionAndLoan}
        valueFormat={{ fractionDigits: 0 }}
      />
    ) : (
      <KpiCard
        key="ni"
        label="National Insurance"
        notSetLabel="None"
        value={parts.nationalInsurance > 0 ? parts.nationalInsurance : null}
        valueFormat={{ fractionDigits: 0 }}
      />
    );

  // Content for the breakdown's one quiet "Show details" disclosure, under its table.
  const details = (
    <>
      <dl className={detailList()}>
        <div className={detailItem()}>
          <dt className={detailLabel()}>Share of pay not taken home</dt>
          <dd className={detailValue()}>{percentFormat.format(shareNotTakenHome)}</dd>
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
    </>
  );

  return (
    <div className={calculatorRoot()}>
      <TaxRatesStatusBanner {...ratesContext} />

      {takeHomeHero}

      {/* Pay before tax, then the two parts that come off it: the first card less the other two is
          the hero, so the strip explains itself. */}
      <KpiStrip className={payStrip()} items={[payBeforeTaxCard, secondCard, thirdCard]} />

      <TakeHomeBreakdown
        details={details}
        incomeTax={v.incomeTax}
        nationalInsurance={v.nationalInsurance}
        pension={v.pension}
        salary={salary}
        studentLoan={v.studentLoan}
        takeHome={v.annual}
      />

      <ScenarioZone
        announcement={
          payRiseModified && tool === "pay-rise"
            ? `estimated change in take-home pay ${formatCurrency(monthlyIncrease)} a month`
            : undefined
        }
        collapsible
        id="scenario-zone"
        isModified={payRiseModified || nextPound.isModified}
        notice={<ProjectionNotice lead={DELTA_PANEL_COPY.unverifiedBanner} />}
        showLabel="Show what-if: change your pay"
        summary={
          payRiseModified && monthlyIncrease > 0
            ? `Your illustration: a ${formatCurrency(salaryIncrease)} pay rise adds an estimated ${formatCurrency(monthlyIncrease)} a month to your take-home pay.`
            : `Starts from your saved salary of ${formatCurrency(salary)} a year and your take-home pay above.`
        }
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
