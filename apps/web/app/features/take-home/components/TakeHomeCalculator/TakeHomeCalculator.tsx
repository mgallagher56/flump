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
import { monthlyPayParts, TakeHomeBreakdown } from "../TakeHomeBreakdown";
import {
  answerCard,
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
/** Caption for the two cards that come off pay, so all three cards carry one. */
const OFF_CAPTION = "Comes off your pay each month";

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

  // The hero is the saved fact alone (D2). No monthly sub-line: the strip below splits the monthly
  // pay, and a fifth figure would push the first view over the number budget (P1).
  const salaryHero = (
    <HeroFigure
      emptyAction={profileLink("Add salary", "primary")}
      emptyPrompt="Add your salary before tax to see an estimate of your take-home pay."
      label="Salary before tax"
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
              label="Monthly take-home pay"
              value={null}
            />,
          ]}
        />
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

  // Take-home, then what comes off in two cards, so the three add up to the monthly pay before
  // tax. With no pension or student loan the second and third are Income Tax and National
  // Insurance, so the strip stays three cards; a part that is nothing reads "None", never £0.
  const offWords = [
    "tax",
    "National Insurance",
    ...(parts.pension > 0 ? ["pension"] : []),
    ...(parts.studentLoan > 0 ? ["student loan"] : []),
  ];
  const takeHomeCaption = `After ${offWords.slice(0, -1).join(", ")} and ${offWords[offWords.length - 1]}`;
  // The answer carries a teal top rule (className only: KpiCard is not changed, and the hero tone
  // stays with the saved salary, D2). The other two are quieter, with one caption each.
  const takeHomeCard = (
    <KpiCard
      key="take-home"
      action={estimateBadge}
      className={answerCard()}
      subtext={takeHomeCaption}
      explain={`Your saved salary before tax, less Income Tax, National Insurance, pension and student loan, at ${taxYear} rates.`}
      label="Monthly take-home pay"
      value={parts.takeHome}
      valueFormat={{ fractionDigits: 0 }}
    />
  );
  const secondCard =
    pensionAndLoan > 0 ? (
      <KpiCard
        key="tax"
        explain={`Income Tax and employee National Insurance on your saved salary, at ${taxYear} rates.`}
        label="Tax and National Insurance"
        subtext={OFF_CAPTION}
        value={parts.incomeTax + parts.nationalInsurance}
        valueFormat={{ fractionDigits: 0 }}
      />
    ) : (
      <KpiCard
        key="income-tax"
        explain={`Income Tax on your saved salary, at ${taxYear} rates.`}
        label="Income Tax"
        subtext={OFF_CAPTION}
        notSetLabel="None"
        unset={parts.incomeTax <= 0}
        value={parts.incomeTax}
        valueFormat={{ fractionDigits: 0 }}
      />
    );
  const pensionLabel =
    parts.pension > 0 && parts.studentLoan > 0
      ? "Pension and student loan"
      : parts.pension > 0
        ? "Pension"
        : "Student loan";
  const pensionExplain =
    parts.pension > 0 && parts.studentLoan > 0
      ? "Your saved pension contribution, and repayments on your saved student loan plan."
      : parts.pension > 0
        ? "Your saved pension contribution, as a share of your salary."
        : "Repayments on your saved student loan plan.";
  const thirdCard =
    pensionAndLoan > 0 ? (
      <KpiCard
        key="pension"
        explain={pensionExplain}
        label={pensionLabel}
        subtext={OFF_CAPTION}
        value={pensionAndLoan}
        valueFormat={{ fractionDigits: 0 }}
      />
    ) : (
      <KpiCard
        key="ni"
        explain={`Employee National Insurance on your saved salary, at ${taxYear} rates.`}
        label="National Insurance"
        subtext={OFF_CAPTION}
        notSetLabel="None"
        unset={parts.nationalInsurance <= 0}
        value={parts.nationalInsurance}
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

      {salaryHero}

      {/* The estimate is the first KPI, never the hero (D2). The three cards add up to the monthly
          pay before tax, so the strip explains itself. */}
      <KpiStrip items={[takeHomeCard, secondCard, thirdCard]} />

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
