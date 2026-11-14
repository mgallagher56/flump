import {
  calculateOverdraftCost,
  type OnboardingSeedPayload,
  persistOnboardingSeed,
} from "@flump/finance-engine";
import { ArrowRight } from "lucide-react";
import type { FC } from "react";
import { useMemo, useState } from "react";
import { ProjectionNotice } from "../../patterns/ProjectionNotice/ProjectionNotice";
import { SimulatorSplitLayout } from "../../patterns/SimulatorSplitLayout/SimulatorSplitLayout";
import { Button } from "../../primitives/Button/Button";
import { Icon } from "../../primitives/Icon";
import { KpiCard } from "../../primitives/KpiCard/KpiCard";
import { LiveRegion } from "../../primitives/LiveRegion/LiveRegion";
import { formatMoney, Money } from "../../primitives/Money/Money";
import { SliderField } from "../../primitives/SliderField/SliderField";
import { ctaLabel } from "../ctaLabel";
import {
  overdraftContent,
  overdraftControls,
  overdraftCta,
  overdraftExplainer,
  overdraftExplainerTitle,
  overdraftHeader,
  overdraftIntro,
  overdraftOutcomes,
  overdraftRoot,
  overdraftTitle,
} from "./OverdraftCostCalculator.styles";

/** Every user-facing string, in one place (COPY-AUDIT, PR 10, overdraft rows). */
export const OVERDRAFT_COPY = {
  title: "Arranged overdraft cost calculator",
  intro: "Estimate a year's interest on an arranged overdraft from the balance and rate you enter.",
  balance: "Average amount overdrawn",
  rate: "Overdraft interest rate (EAR)",
  rateHelp: "The equivalent annual rate (EAR) shown in your banking app or on your statement.",
  kpiYear: "Estimated interest a year",
  kpiMonth: "Estimated interest a month",
  kpiMonthSubtext: "Charged to your current account.",
  explainerTitle: "How overdraft interest works",
  explainer:
    "An arranged overdraft has no fixed end date. Interest is charged for as long as the account is overdrawn, and stops on any amount that is paid off.",
  controlsLabel: "Overdraft details",
  contentLabel: "Estimated overdraft interest",
} as const;

export const OVERDRAFT_DEFAULT_CTA = "Continue to sign up";

const money = (n: number) => formatMoney(n).text;

/** Spoken after inputs settle (COPY-AUDIT row for the live region). */
export const overdraftAnnouncement = (annual: string) =>
  `Illustration: estimated overdraft interest ${annual} a year`;

const BALANCE_MAX = 25_000;
const RATE_MAX = 60;

/** What the button pre-fills for sign-up: only the balance the visitor entered. */
export type OverdraftSeedPayload = OnboardingSeedPayload & {
  mode: "DEBT";
  totalUnsecuredDebt: number;
};

export interface OverdraftCostCalculatorProps {
  onSaveAndContinue?: (payload: OverdraftSeedPayload) => void;
  ctaText?: string;
  /** When false, entered figures are not written to the onboarding seed in local storage. Default true. */
  persistSeed?: boolean;
  /** Starting values (examples, not anyone's saved figures). */
  initialBalance?: number;
  initialRate?: number;
}

/**
 * Signed-out tool: a year's interest on an arranged overdraft. Every figure comes from the
 * engine's `calculateOverdraftCost`; this component only clamps inputs and formats results.
 */
export const OverdraftCostCalculator: FC<OverdraftCostCalculatorProps> = ({
  onSaveAndContinue,
  ctaText = OVERDRAFT_DEFAULT_CTA,
  persistSeed = true,
  initialBalance = 1200,
  initialRate = 39.9,
}) => {
  // Clamped so a negative entry never reaches the engine (a negative rate would give a negative cost).
  const [balance, setBalance] = useState(Math.max(0, initialBalance));
  const [rate, setRate] = useState(Math.max(0, initialRate));

  const cost = useMemo(() => calculateOverdraftCost(balance, rate), [balance, rate]);

  const announcement = overdraftAnnouncement(money(cost.annualPoundCost));

  const handleSave = () => {
    const payload: OverdraftSeedPayload = {
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
    <div className={overdraftControls()}>
      <SliderField
        format="currency"
        label={OVERDRAFT_COPY.balance}
        max={BALANCE_MAX}
        min={0}
        step={50}
        value={balance}
        onChange={(v) => setBalance(Math.max(0, v))}
      />
      <SliderField
        format="percent"
        fractionDigits={1}
        helperText={OVERDRAFT_COPY.rateHelp}
        label={OVERDRAFT_COPY.rate}
        max={RATE_MAX}
        min={0}
        step={0.1}
        value={rate}
        onChange={(v) => setRate(Math.max(0, v))}
      />
    </div>
  );

  const content = (
    <div className={overdraftContent()}>
      {/* Illustration outcomes, not saved figures, so plain outcome cards rather than a KpiStrip.
          One outcome, then at most two supporting figures. */}
      <div className={overdraftOutcomes()} data-density="compact" data-testid="overdraft-outcomes">
        <KpiCard label={OVERDRAFT_COPY.kpiYear} value={cost.annualPoundCost} />
        <KpiCard
          label={OVERDRAFT_COPY.kpiMonth}
          subtext={OVERDRAFT_COPY.kpiMonthSubtext}
          value={<Money size="lg" value={cost.monthlyPoundCost} />}
        />
      </div>

      <div className={overdraftExplainer()}>
        <h3 className={overdraftExplainerTitle()}>{OVERDRAFT_COPY.explainerTitle}</h3>
        <p>{OVERDRAFT_COPY.explainer}</p>
      </div>

      <ProjectionNotice />
      <LiveRegion debounceMs={1000} message={announcement} visuallyHidden />
    </div>
  );

  return (
    <div className={overdraftRoot()} data-testid="overdraft-cost-tool">
      <div className={overdraftHeader()}>
        <h2 className={overdraftTitle()}>{OVERDRAFT_COPY.title}</h2>
        <p className={overdraftIntro()}>{OVERDRAFT_COPY.intro}</p>
      </div>

      <SimulatorSplitLayout
        content={content}
        contentLabel={OVERDRAFT_COPY.contentLabel}
        controls={controls}
        controlsLabel={OVERDRAFT_COPY.controlsLabel}
      />

      <Button className={overdraftCta()} size="md" variant="primary" onClick={handleSave}>
        {ctaLabel(ctaText)} <Icon icon={ArrowRight} size="sm" />
      </Button>
    </div>
  );
};

export default OverdraftCostCalculator;
