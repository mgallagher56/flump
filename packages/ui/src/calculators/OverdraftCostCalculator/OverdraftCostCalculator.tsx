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
import { CollapsibleDrawer } from "../../primitives/CollapsibleDrawer/CollapsibleDrawer";
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
  /** Follows the monthly figure in the line under the headline: "£40 a month, charged to ...". */
  monthLine: "a month, charged to your current account.",
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
  /** Inside a tool page that already shows the title and description: hide this calculator's own title and intro. */
  embedded?: boolean;
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
  embedded = false,
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
      {/* Illustration outcome, not a saved figure, so a plain outcome card rather than a KpiStrip.
          The monthly figure is the one supporting figure, in the card's own caption (it replaced a
          second card, so this caption may carry one figure). */}
      <div className={overdraftOutcomes()} data-density="compact" data-testid="overdraft-outcomes">
        <KpiCard
          label={OVERDRAFT_COPY.kpiYear}
          subtext={
            <>
              <Money value={cost.monthlyPoundCost} /> {OVERDRAFT_COPY.monthLine}
            </>
          }
          value={cost.annualPoundCost}
        />
      </div>

      <Button className={overdraftCta()} size="md" variant="primary" onClick={handleSave}>
        {ctaLabel(ctaText)} <Icon icon={ArrowRight} size="sm" />
      </Button>

      {/* Closed by default so the first view keeps to the outcome (P1). */}
      <CollapsibleDrawer title={OVERDRAFT_COPY.explainerTitle} variant="quiet">
        <p className={overdraftExplainer()}>{OVERDRAFT_COPY.explainer}</p>
      </CollapsibleDrawer>

      <ProjectionNotice />
      <LiveRegion debounceMs={1000} message={announcement} visuallyHidden />
    </div>
  );

  return (
    <div className={overdraftRoot()} data-testid="overdraft-cost-tool">
      {embedded ? null : (
        <div className={overdraftHeader()}>
          <h2 className={overdraftTitle()}>{OVERDRAFT_COPY.title}</h2>
          <p className={overdraftIntro()}>{OVERDRAFT_COPY.intro}</p>
        </div>
      )}

      <SimulatorSplitLayout
        content={content}
        contentLabel={OVERDRAFT_COPY.contentLabel}
        controls={controls}
        controlsLabel={OVERDRAFT_COPY.controlsLabel}
      />
    </div>
  );
};

export default OverdraftCostCalculator;
