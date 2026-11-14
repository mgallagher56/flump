import {
  calculateMortgageVsIsa,
  type OnboardingSeedPayload,
  persistOnboardingSeed,
} from "@flump/finance-engine";
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
  mortgageIsaExplainerTitle,
  mortgageIsaHeader,
  mortgageIsaIntro,
  mortgageIsaOutcomes,
  mortgageIsaRoot,
  mortgageIsaTitle,
} from "./MortgageVsIsaCalculator.styles";

const percentText = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });
const oneDecimal = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

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
  kpiSetAside: (years: number) => `Extra money set aside over ${years} years`,
  kpiSetAsideSubtext: "The same amount each month, either overpaid or paid into an ISA.",
  kpiInterestSaved: "Overpaying: estimated interest saved",
  kpiInterestSavedSubtext: (years: string) =>
    `Paid off about ${years} years sooner, if the rate stays the same.`,
  kpiInterestSavedNoBalance: "No mortgage balance entered.",
  kpiInterestSavedNoExtra: "No overpayment entered.",
  kpiIsaBalance: "ISA: estimated balance",
  kpiIsaBalanceSubtext: (growth: string, rate: string) =>
    `Includes ${growth} of growth at the ${rate}% a year you entered.`,
  explainerTitle: "What this leaves out",
  explainer:
    "Both are compared over the years left that you set. This does not count investing the mortgage payment once the mortgage is paid off early, charges, or early repayment limits on your mortgage. ISA growth is not fixed and can be negative.",
  controlsLabel: "Mortgage and ISA details",
  contentLabel: "Estimated interest saved and ISA balance",
} as const;

export const MORTGAGE_ISA_DEFAULT_CTA = "Continue to sign up";

const money = (n: number) => formatMoney(n).text;

/** Spoken after inputs settle (COPY-AUDIT row for the live region). */
export const mortgageIsaAnnouncement = (interestSaved: string, isaBalance: string) =>
  `Illustration: overpaying, estimated interest saved ${interestSaved}. ISA, estimated balance ${isaBalance}.`;

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
}) => {
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
    money(result.isaAccumulatedValue),
  );

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

  const content = (
    <div className={mortgageIsaContent()}>
      {/* Illustration outcomes, not saved figures. The two options sit side by side in the same
          neutral style: neither is marked as better. */}
      <div
        className={mortgageIsaOutcomes()}
        data-density="compact"
        data-testid="mortgage-isa-outcomes"
      >
        <KpiCard
          label={MORTGAGE_ISA_COPY.kpiSetAside(termYears)}
          subtext={MORTGAGE_ISA_COPY.kpiSetAsideSubtext}
          value={result.totalIsaContributed}
        />
        <KpiCard
          label={MORTGAGE_ISA_COPY.kpiInterestSaved}
          subtext={
            balance <= 0
              ? MORTGAGE_ISA_COPY.kpiInterestSavedNoBalance
              : extra <= 0
                ? MORTGAGE_ISA_COPY.kpiInterestSavedNoExtra
                : MORTGAGE_ISA_COPY.kpiInterestSavedSubtext(
                    oneDecimal.format(Number(result.yearsShaved)),
                  )
          }
          value={<Money size="lg" value={result.interestSaved} />}
        />
        <KpiCard
          label={MORTGAGE_ISA_COPY.kpiIsaBalance}
          subtext={MORTGAGE_ISA_COPY.kpiIsaBalanceSubtext(
            money(result.isaGrowth),
            percentText.format(isaGrowth),
          )}
          value={<Money size="lg" value={result.isaAccumulatedValue} />}
        />
      </div>

      <div className={mortgageIsaExplainer()}>
        <h3 className={mortgageIsaExplainerTitle()}>{MORTGAGE_ISA_COPY.explainerTitle}</h3>
        <p>{MORTGAGE_ISA_COPY.explainer}</p>
      </div>

      <ProjectionNotice />
      <LiveRegion debounceMs={1000} message={announcement} visuallyHidden />
    </div>
  );

  return (
    <div className={mortgageIsaRoot()} data-testid="mortgage-vs-isa-tool">
      <div className={mortgageIsaHeader()}>
        <h2 className={mortgageIsaTitle()}>{MORTGAGE_ISA_COPY.title}</h2>
        <p className={mortgageIsaIntro()}>{MORTGAGE_ISA_COPY.intro}</p>
      </div>

      <SimulatorSplitLayout
        content={content}
        contentLabel={MORTGAGE_ISA_COPY.contentLabel}
        controls={controls}
        controlsLabel={MORTGAGE_ISA_COPY.controlsLabel}
      />

      <Button className={mortgageIsaCta()} size="md" variant="primary" onClick={handleSave}>
        {ctaLabel(ctaText)} <Icon icon={ArrowRight} size="sm" />
      </Button>
    </div>
  );
};

export default MortgageVsIsaCalculator;
