import {
  calculateZeroPercentCliff,
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
  zeroContent,
  zeroControls,
  zeroCta,
  zeroExplainer,
  zeroHeader,
  zeroIntro,
  zeroOutcomes,
  zeroOutcomeText,
  zeroRoot,
  zeroTitle,
} from "./ZeroPercentCliffCalculator.styles";

/** Every user-facing string, in one place (COPY-AUDIT, PR 10, 0% deal end rows). */
export const ZERO_PERCENT_COPY = {
  title: "When a 0% balance transfer ends",
  intro: "Estimate the monthly payment that pays off a balance before the 0% deal ends.",
  balance: "Balance on the 0% card",
  months: "Months left on the 0% deal",
  rate: "Interest rate after the 0% deal ends (APR)",
  kpiPayment: "Estimated monthly payment",
  kpiPaymentSubtext:
    "Pays off the balance before the deal ends and interest starts, as long as no fees are added.",
  nothingOwed: "No balance to repay",
  nothingOwedSubtext: "There is no balance on the 0% card to pay off.",
  kpiLeftNothingOwedSubtext: "Nothing is left when the deal ends.",
  kpiLeft: "Left after minimum payments",
  kpiLeftSubtext: "At today's minimum payment.",
  kpiLeftClearedSubtext: "Minimum payments clear it in time.",
  kpiInterest: "Estimated first-year interest",
  kpiInterestSubtext: "If nothing more were paid.",
  explainerTitle: "What happens when the 0% deal ends",
  explainer:
    "Any balance left when the 0% deal ends is charged interest at the card's standard rate. Fees, such as a balance transfer fee, are not included here.",
  minimumExplainer:
    "The minimum payment is taken as 2% of today's balance, or £25 if that is more, each month. It stays at that amount until the deal ends.",
  interestExplainer:
    "The interest estimate is for the first year after the deal ends, on the amount left, at the rate you entered.",
  controlsLabel: "0% deal details",
  contentLabel: "Estimated payment",
} as const;

export const ZERO_PERCENT_DEFAULT_CTA = "Continue to sign up";

/** Spoken after inputs settle (COPY-AUDIT row for the live region). */
export const zeroPercentAnnouncement = (monthly: string) =>
  `Illustration: ${monthly} a month pays off the balance before the 0% deal ends`;

/** Spoken when there is no balance to pay off. */
export const ZERO_PERCENT_NOTHING_OWED_ANNOUNCEMENT =
  "Illustration: there is no balance to pay off";

const BALANCE_MAX = 20_000;
const MONTHS_MIN = 1;
const MONTHS_MAX = 48;
const RATE_MAX = 60;

const clampMonths = (n: number) =>
  Math.min(MONTHS_MAX, Math.max(MONTHS_MIN, Math.round(n) || MONTHS_MIN));

/** What the button pre-fills for sign-up: only the balance the visitor entered. */
export type ZeroPercentSeedPayload = OnboardingSeedPayload & {
  mode: "DEBT";
  totalUnsecuredDebt: number;
};

export interface ZeroPercentCliffCalculatorProps {
  onSaveAndContinue?: (payload: ZeroPercentSeedPayload) => void;
  ctaText?: string;
  /** When false, entered figures are not written to the onboarding seed in local storage. Default true. */
  persistSeed?: boolean;
  /** Starting values (examples, not anyone's saved figures). */
  initialBalance?: number;
  initialMonths?: number;
  initialRate?: number;
  /** Inside a tool page that already shows the title and description: hide this calculator's own title and intro. */
  embedded?: boolean;
}

/**
 * Signed-out tool: the monthly payment that pays off a 0% balance before the deal ends, and what
 * minimum payments alone would leave. Every figure comes from the engine's
 * `calculateZeroPercentCliff`; this component only clamps inputs and formats results. The results
 * are neutral facts, so no alarm styling.
 */
export const ZeroPercentCliffCalculator: FC<ZeroPercentCliffCalculatorProps> = ({
  onSaveAndContinue,
  ctaText = ZERO_PERCENT_DEFAULT_CTA,
  persistSeed = true,
  initialBalance = 3600,
  initialMonths = 18,
  initialRate = 24.9,
  embedded = false,
}) => {
  const [balance, setBalance] = useState(Math.max(0, initialBalance));
  const [monthsLeft, setMonthsLeft] = useState(clampMonths(initialMonths));
  const [rate, setRate] = useState(Math.max(0, initialRate));

  const cliff = useMemo(
    () => calculateZeroPercentCliff(balance, monthsLeft, rate),
    [balance, monthsLeft, rate],
  );
  const minimumClears = cliff.balanceRemainingIfMinimum <= 0;
  const nothingOwed = balance <= 0;

  const announcement = nothingOwed
    ? ZERO_PERCENT_NOTHING_OWED_ANNOUNCEMENT
    : zeroPercentAnnouncement(formatMoney(cliff.requiredMonthlyPayment).text);

  const handleSave = () => {
    const payload: ZeroPercentSeedPayload = {
      mode: "DEBT",
      totalUnsecuredDebt: balance,
      inferredModules: ["accounts", "debt", "budget"],
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
    <div className={zeroControls()}>
      <SliderField
        format="currency"
        label={ZERO_PERCENT_COPY.balance}
        max={BALANCE_MAX}
        min={0}
        step={50}
        value={balance}
        onChange={(v) => setBalance(Math.max(0, v))}
      />
      <SliderField
        label={ZERO_PERCENT_COPY.months}
        max={MONTHS_MAX}
        min={MONTHS_MIN}
        step={1}
        value={monthsLeft}
        onChange={(v) => setMonthsLeft(clampMonths(v))}
      />
      <SliderField
        format="percent"
        fractionDigits={1}
        label={ZERO_PERCENT_COPY.rate}
        max={RATE_MAX}
        min={0}
        step={0.1}
        value={rate}
        onChange={(v) => setRate(Math.max(0, v))}
      />
    </div>
  );

  const content = (
    <div className={zeroContent()}>
      {/* Illustration outcomes, not saved figures. One outcome, then at most two supporting
          figures; when the minimum alone clears the balance the interest card goes and the
          lone supporting card spans the row. */}
      <div className={zeroOutcomes()} data-density="compact" data-testid="zero-percent-outcomes">
        <KpiCard
          label={ZERO_PERCENT_COPY.kpiPayment}
          subtext={
            nothingOwed ? ZERO_PERCENT_COPY.nothingOwedSubtext : ZERO_PERCENT_COPY.kpiPaymentSubtext
          }
          value={
            nothingOwed ? (
              <span className={zeroOutcomeText()}>{ZERO_PERCENT_COPY.nothingOwed}</span>
            ) : (
              cliff.requiredMonthlyPayment
            )
          }
        />
        <KpiCard
          label={ZERO_PERCENT_COPY.kpiLeft}
          subtext={
            nothingOwed
              ? ZERO_PERCENT_COPY.kpiLeftNothingOwedSubtext
              : minimumClears
                ? ZERO_PERCENT_COPY.kpiLeftClearedSubtext
                : ZERO_PERCENT_COPY.kpiLeftSubtext
          }
          value={<Money size="lg" value={cliff.balanceRemainingIfMinimum} />}
        />
        {minimumClears ? null : (
          <KpiCard
            label={ZERO_PERCENT_COPY.kpiInterest}
            subtext={ZERO_PERCENT_COPY.kpiInterestSubtext}
            value={<Money size="lg" value={cliff.penaltyInterestFirstYearIfUnpaid} />}
          />
        )}
      </div>

      <Button className={zeroCta()} size="md" variant="primary" onClick={handleSave}>
        {ctaLabel(ctaText)} <Icon icon={ArrowRight} size="sm" />
      </Button>

      {/* Closed by default: the minimum-payment working adds figures, so it stays out of the
          first view, which keeps to the outcome and two supporting figures. */}
      <CollapsibleDrawer title={ZERO_PERCENT_COPY.explainerTitle} variant="quiet">
        <div className={zeroExplainer()}>
          <p>{ZERO_PERCENT_COPY.explainer}</p>
          <p>{ZERO_PERCENT_COPY.minimumExplainer}</p>
          <p>{ZERO_PERCENT_COPY.interestExplainer}</p>
        </div>
      </CollapsibleDrawer>

      <ProjectionNotice />
      <LiveRegion debounceMs={1000} message={announcement} visuallyHidden />
    </div>
  );

  return (
    <div className={zeroRoot()} data-testid="zero-percent-cliff-tool">
      {embedded ? null : (
        <div className={zeroHeader()}>
          <h2 className={zeroTitle()}>{ZERO_PERCENT_COPY.title}</h2>
          <p className={zeroIntro()}>{ZERO_PERCENT_COPY.intro}</p>
        </div>
      )}

      <SimulatorSplitLayout
        content={content}
        contentLabel={ZERO_PERCENT_COPY.contentLabel}
        controls={controls}
        controlsLabel={ZERO_PERCENT_COPY.controlsLabel}
      />
    </div>
  );
};

export default ZeroPercentCliffCalculator;
