import {
  calculateMortgageVsIsa,
  type OnboardingSeedPayload,
  persistOnboardingSeed,
} from "@flump/finance-engine";
import { formatDuration } from "@flump/format";
import { ArrowRight } from "lucide-react";
import type { FC } from "react";
import { useMemo, useState } from "react";
import { ProjectionNotice } from "../../patterns/ProjectionNotice/ProjectionNotice";
import { SimulatorSplitLayout } from "../../patterns/SimulatorSplitLayout/SimulatorSplitLayout";
import { Button } from "../../primitives/Button/Button";
import { CollapsibleDrawer } from "../../primitives/CollapsibleDrawer/CollapsibleDrawer";
import { Icon } from "../../primitives/Icon";
import { KpiCard } from "../../primitives/KpiCard/KpiCard";
import { LiveRegion } from "../../primitives/LiveRegion/LiveRegion";
import { formatMoney, Money } from "../../primitives/Money/Money";
import { SliderField } from "../../primitives/SliderField/SliderField";
import { ctaLabel } from "../ctaLabel";
import {
  mortgageIsaContent,
  mortgageIsaControls,
  mortgageIsaCta,
  mortgageIsaDrawerBody,
  mortgageIsaExplainer,
  mortgageIsaHeader,
  mortgageIsaIntro,
  mortgageIsaOutcomes,
  mortgageIsaRoot,
  mortgageIsaTitle,
} from "./MortgageVsIsaCalculator.styles";

/** Every user-facing string, in one place (COPY-AUDIT, PR 10, mortgage vs ISA rows). */
export const MORTGAGE_ISA_COPY = {
  title: "Mortgage overpayment or ISA",
  intro: "Compare the interest saved by overpaying with what the same money might earn in an ISA.",
  balance: "Mortgage balance",
  rate: "Mortgage interest rate",
  extra: "Extra money a month",
  moreOptions: "More options",
  isaGrowth: "Assumed ISA growth a year",
  term: "Years left on the mortgage",
  /** Headline labels: the larger of the two outcomes, by how much. */
  kpiDifferenceIsa: "Estimated ISA growth above the interest saved by overpaying",
  kpiDifferenceOverpay: "Estimated interest saved by overpaying above ISA growth",
  kpiDifferenceEven: "Estimated difference between overpaying and the ISA",
  kpiDifferenceSubtext:
    "The same amount each month, either overpaid or paid into an ISA, over the years left.",
  kpiInterestSaved: "Overpaying: estimated interest saved",
  kpiInterestSavedSubtext: "Paid off sooner, if the rate stays the same.",
  kpiInterestSavedNoBalance: "No mortgage balance entered.",
  kpiInterestSavedNoExtra: "No overpayment entered.",
  kpiIsaGrowth: "ISA: estimated growth",
  kpiIsaGrowthSubtext: "On top of the money paid in, at the growth rate you entered.",
  explainerTitle: "How this is worked out",
  /** "Overpaying pays the mortgage off 5 years 4 months sooner, if the rate stays the same." */
  explainerSooner: (sooner: string) =>
    `Overpaying pays the mortgage off ${sooner} sooner, if the rate stays the same.`,
  explainer:
    "Both are compared over the years left that you set. This does not count investing the mortgage payment once the mortgage is paid off early, charges, or early repayment limits on your mortgage. ISA growth is not fixed and can be negative.",
  controlsLabel: "Mortgage and ISA details",
  contentLabel: "Estimated interest saved and ISA growth",
} as const;

export const MORTGAGE_ISA_DEFAULT_CTA = "Continue to sign up";

const money = (n: number) => formatMoney(n).text;

/** Spoken after inputs settle (COPY-AUDIT row for the live region). */
export const mortgageIsaAnnouncement = (interestSaved: string, isaGrowth: string) =>
  `Illustration: overpaying, estimated interest saved ${interestSaved}. ISA, estimated growth ${isaGrowth}.`;

const BALANCE_MAX = 1_000_000;
const RATE_MAX = 15;
const EXTRA_MAX = 3_000;
const GROWTH_MAX = 15;
const TERM_MIN = 1;
const TERM_MAX = 40;

const clampTerm = (v: number) => Math.min(TERM_MAX, Math.max(TERM_MIN, Math.round(v) || TERM_MIN));

/** What the button pre-fills for sign-up (shape unchanged from earlier versions). */
export type MortgageVsIsaSeedPayload = OnboardingSeedPayload & {
  annualIncome: number;
  monthlyContribution: number;
  mortgageBalance: number;
};

export interface MortgageVsIsaCalculatorProps {
  onSaveAndContinue?: (payload: MortgageVsIsaSeedPayload) => void;
  ctaText?: string;
  /** When false, entered figures are not written to the onboarding seed in local storage. Default true. */
  persistSeed?: boolean;
  /** Starting values (examples, not anyone's saved figures). */
  initialBalance?: number;
  initialRate?: number;
  initialExtra?: number;
  initialIsaGrowth?: number;
  initialTermYears?: number;
  /** Inside a tool page that already shows the title and description: hide this calculator's own title and intro. */
  embedded?: boolean;
}

/**
 * Signed-out tool: the interest a monthly overpayment would save next to what the same money
 * might grow to in an ISA. Neither is presented as the better choice. Every figure comes from the
 * engine's `calculateMortgageVsIsa`; this component only clamps inputs and formats results.
 */
export const MortgageVsIsaCalculator: FC<MortgageVsIsaCalculatorProps> = ({
  onSaveAndContinue,
  ctaText = MORTGAGE_ISA_DEFAULT_CTA,
  persistSeed = true,
  initialBalance = 240_000,
  initialRate = 4.5,
  initialExtra = 350,
  initialIsaGrowth = 7,
  initialTermYears = 20,
  embedded = false,
}) => {
  // Embedded, the page's h1 sits directly above, so section headings step down to h2.
  // Clamped so a negative entry never reaches the engine.
  const [balance, setBalance] = useState(Math.max(0, initialBalance));
  const [rate, setRate] = useState(Math.max(0, initialRate));
  const [extra, setExtra] = useState(Math.max(0, initialExtra));
  const [isaGrowth, setIsaGrowth] = useState(Math.max(0, initialIsaGrowth));
  const [termYears, setTermYears] = useState(clampTerm(initialTermYears));

  const result = useMemo(
    () => calculateMortgageVsIsa(balance, rate, termYears, extra, isaGrowth),
    [balance, rate, termYears, extra, isaGrowth],
  );

  const announcement = mortgageIsaAnnouncement(
    money(result.interestSaved),
    money(result.isaGrowth),
  );

  // The engine's netWealthDelta is ISA growth less interest saved: its sign says which is larger.
  // Under 50p either way reads as no difference.
  const delta = result.netWealthDelta;
  const differenceLabel =
    delta >= 0.5
      ? MORTGAGE_ISA_COPY.kpiDifferenceIsa
      : delta <= -0.5
        ? MORTGAGE_ISA_COPY.kpiDifferenceOverpay
        : MORTGAGE_ISA_COPY.kpiDifferenceEven;

  const handleSave = () => {
    const payload: MortgageVsIsaSeedPayload = {
      annualIncome: 75000,
      monthlyContribution: extra,
      mortgageBalance: balance,
      inferredModules: ["mortgage", "accounts", "forecast"],
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
    <div className={mortgageIsaControls()}>
      <SliderField
        format="currency"
        label={MORTGAGE_ISA_COPY.balance}
        max={BALANCE_MAX}
        min={0}
        step={5000}
        value={balance}
        onChange={(v) => setBalance(Math.max(0, v))}
      />
      <SliderField
        format="percent"
        fractionDigits={2}
        label={MORTGAGE_ISA_COPY.rate}
        max={RATE_MAX}
        min={0}
        step={0.05}
        value={rate}
        onChange={(v) => setRate(Math.max(0, v))}
      />
      <SliderField
        format="currency"
        label={MORTGAGE_ISA_COPY.extra}
        max={EXTRA_MAX}
        min={0}
        step={25}
        value={extra}
        onChange={(v) => setExtra(Math.max(0, v))}
      />
      <CollapsibleDrawer closedLabel="" openLabel="" title={MORTGAGE_ISA_COPY.moreOptions}>
        <div className={mortgageIsaDrawerBody()}>
          <SliderField
            format="percent"
            fractionDigits={2}
            label={MORTGAGE_ISA_COPY.isaGrowth}
            max={GROWTH_MAX}
            min={0}
            step={0.25}
            value={isaGrowth}
            onChange={(v) => setIsaGrowth(Math.max(0, v))}
          />
          <SliderField
            label={MORTGAGE_ISA_COPY.term}
            max={TERM_MAX}
            min={TERM_MIN}
            step={1}
            value={termYears}
            onChange={(v) => setTermYears(clampTerm(v))}
          />
        </div>
      </CollapsibleDrawer>
    </div>
  );

  const showSooner = balance > 0 && extra > 0 && result.monthsShaved > 0;
  const content = (
    <div className={mortgageIsaContent()}>
      {/* Illustration outcomes, not saved figures. The headline is the difference between the
          two; the two options then sit side by side in the same neutral style. */}
      <div
        className={mortgageIsaOutcomes()}
        data-density="compact"
        data-testid="mortgage-isa-outcomes"
      >
        <KpiCard
          label={differenceLabel}
          subtext={MORTGAGE_ISA_COPY.kpiDifferenceSubtext}
          value={Math.abs(delta)}
        />
        <KpiCard
          label={MORTGAGE_ISA_COPY.kpiInterestSaved}
          subtext={
            balance <= 0
              ? MORTGAGE_ISA_COPY.kpiInterestSavedNoBalance
              : extra <= 0
                ? MORTGAGE_ISA_COPY.kpiInterestSavedNoExtra
                : MORTGAGE_ISA_COPY.kpiInterestSavedSubtext
          }
          value={<Money size="lg" value={result.interestSaved} />}
        />
        <KpiCard
          label={MORTGAGE_ISA_COPY.kpiIsaGrowth}
          subtext={MORTGAGE_ISA_COPY.kpiIsaGrowthSubtext}
          value={<Money size="lg" value={result.isaGrowth} />}
        />
      </div>

      <Button className={mortgageIsaCta()} size="md" variant="primary" onClick={handleSave}>
        {ctaLabel(ctaText)} <Icon icon={ArrowRight} size="sm" />
      </Button>

      {/* Closed by default so the first view keeps to the headline and two figures (P1). */}
      <CollapsibleDrawer title={MORTGAGE_ISA_COPY.explainerTitle} variant="quiet">
        <div className={mortgageIsaExplainer()}>
          <p>
            {showSooner
              ? `${MORTGAGE_ISA_COPY.explainerSooner(formatDuration(result.monthsShaved))} `
              : null}
            {MORTGAGE_ISA_COPY.explainer}
          </p>
        </div>
      </CollapsibleDrawer>

      <ProjectionNotice />
      <LiveRegion debounceMs={1000} message={announcement} visuallyHidden />
    </div>
  );

  return (
    <div className={mortgageIsaRoot()} data-testid="mortgage-vs-isa-tool">
      {embedded ? null : (
        <div className={mortgageIsaHeader()}>
          <h2 className={mortgageIsaTitle()}>{MORTGAGE_ISA_COPY.title}</h2>
          <p className={mortgageIsaIntro()}>{MORTGAGE_ISA_COPY.intro}</p>
        </div>
      )}

      <SimulatorSplitLayout
        content={content}
        contentLabel={MORTGAGE_ISA_COPY.contentLabel}
        controls={controls}
        controlsLabel={MORTGAGE_ISA_COPY.controlsLabel}
      />
    </div>
  );
};

export default MortgageVsIsaCalculator;
