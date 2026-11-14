import {
  calculateSection24LandlordTax,
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
import { formatMoney, Money, Num } from "../../primitives/Money/Money";
import { SliderField } from "../../primitives/SliderField/SliderField";
import { StatusBadge } from "../../primitives/StatusBadge/StatusBadge";
import { ctaLabel } from "../ctaLabel";
import {
  section24Badges,
  section24Content,
  section24Controls,
  section24Cta,
  section24DrawerBody,
  section24Explainer,
  section24ExplainerTitle,
  section24Header,
  section24Intro,
  section24Outcomes,
  section24Root,
  section24Title,
} from "./Section24Calculator.styles";

/** Every user-facing string, in one place (COPY-AUDIT, PR 10, Section 24 rows). */
export const SECTION24_COPY = {
  title: "Tax on rental income under Section 24",
  intro:
    "Estimate the tax on rental income when mortgage interest gets a 20% tax credit and is not deducted from profit.",
  unverifiedBadge: "Unverified estimate",
  rentalIncome: "Rental income a year, before costs",
  mortgageInterest: "Mortgage interest a year",
  otherIncome: "Other taxable income a year (salary or profits)",
  moreOptions: "More options",
  allowableExpenses: "Other allowable costs a year (repairs, agent fees)",
  kpiTax: "Estimated tax on rental income",
  kpiCash: "Estimated cash left after costs, mortgage interest and tax",
  kpiRate: "Tax as a share of taxable profit",
  explainerTitle: "How Section 24 works",
  explainer:
    "Mortgage interest is not deducted from rental profit. Instead, the tax is reduced by 20% of the interest, up to 20% of the taxable rental profit. The estimate uses England, Wales and Northern Ireland rates for a sole owner. Flump does not file your tax return.",
  controlsLabel: "Rental figures",
  contentLabel: "Estimated tax on rental income",
} as const;

export const SECTION24_DEFAULT_CTA = "Continue to sign up";

/** "£6,400 tax before the credit, minus a £1,600 credit for mortgage interest". */
export const section24TaxBreakdown = (beforeCredit: string, credit: string) =>
  `${beforeCredit} tax before the credit, minus a ${credit} credit for mortgage interest`;

export const section24CashPerMonth = (monthly: string) => `${monthly} a month`;

export const section24RateOf = (taxableProfit: string) =>
  `Of ${taxableProfit} taxable rental profit (rent less costs; mortgage interest is not deducted)`;

/** Spoken after inputs settle (COPY-AUDIT row for the live region). */
export const section24Announcement = (tax: string, cash: string) =>
  `Illustration: estimated tax on rental income ${tax} a year. Estimated cash left ${cash} a year.`;

const money = (n: number) => formatMoney(n).text;

const RENT_MAX = 100_000;
const INTEREST_MAX = 50_000;
const OTHER_INCOME_MAX = 150_000;
const EXPENSES_MAX = 15_000;

/**
 * What the button pre-fills for sign-up. The shape is unchanged from before the rebuild, so the
 * sign-up flow reads it as it always has.
 */
export type Section24SeedPayload = OnboardingSeedPayload & {
  annualIncome: number;
  initialCashSavings: number;
  mortgageBalance: number;
  inferredModules: string[];
  timestamp: number;
};

export interface Section24CalculatorProps {
  onSaveAndContinue?: (payload: Section24SeedPayload) => void;
  ctaText?: string;
  /** When false, entered figures are not written to the onboarding seed in local storage. Default true. */
  persistSeed?: boolean;
  /** Starting values (examples, not anyone's saved figures). */
  initialRentalIncome?: number;
  initialMortgageInterest?: number;
  initialAllowableExpenses?: number;
  initialOtherIncome?: number;
}

const clamp = (v: number) => Math.max(0, v);

/**
 * Signed-out tool: tax on rental income under Section 24. Every figure comes from the engine's
 * `calculateSection24LandlordTax`; this component only clamps inputs and formats results.
 */
export const Section24Calculator: FC<Section24CalculatorProps> = ({
  onSaveAndContinue,
  ctaText = SECTION24_DEFAULT_CTA,
  persistSeed = true,
  initialRentalIncome = 18_000,
  initialMortgageInterest = 8_000,
  initialAllowableExpenses = 2_000,
  initialOtherIncome = 60_000,
}) => {
  // Clamped so a negative entry never reaches the engine.
  const [rentalIncome, setRentalIncome] = useState(clamp(initialRentalIncome));
  const [mortgageInterest, setMortgageInterest] = useState(clamp(initialMortgageInterest));
  const [allowableExpenses, setAllowableExpenses] = useState(clamp(initialAllowableExpenses));
  const [otherIncome, setOtherIncome] = useState(clamp(initialOtherIncome));

  const result = useMemo(
    () =>
      calculateSection24LandlordTax(otherIncome, rentalIncome, mortgageInterest, allowableExpenses),
    [otherIncome, rentalIncome, mortgageInterest, allowableExpenses],
  );

  const tax = result.finalTaxDue;
  const cashLeft = result.netRentalIncomeAfterTax;

  const announcement = section24Announcement(money(tax), money(cashLeft));

  const handleSave = () => {
    const payload: Section24SeedPayload = {
      annualIncome: otherIncome,
      initialCashSavings: 500,
      mortgageBalance: 200000,
      inferredModules: ["tax", "mortgage", "forecast"],
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
    <div className={section24Controls()}>
      <SliderField
        format="currency"
        label={SECTION24_COPY.rentalIncome}
        max={RENT_MAX}
        min={0}
        step={500}
        value={rentalIncome}
        onChange={(v) => setRentalIncome(clamp(v))}
      />
      <SliderField
        format="currency"
        label={SECTION24_COPY.mortgageInterest}
        max={INTEREST_MAX}
        min={0}
        step={250}
        value={mortgageInterest}
        onChange={(v) => setMortgageInterest(clamp(v))}
      />
      <SliderField
        format="currency"
        label={SECTION24_COPY.otherIncome}
        max={OTHER_INCOME_MAX}
        min={0}
        step={500}
        value={otherIncome}
        onChange={(v) => setOtherIncome(clamp(v))}
      />
      {/* Named by its title; the visible action text is left out. State lives here, so closing
          the drawer keeps the figure. */}
      <CollapsibleDrawer closedLabel="" openLabel="" title={SECTION24_COPY.moreOptions}>
        <div className={section24DrawerBody()}>
          <SliderField
            format="currency"
            label={SECTION24_COPY.allowableExpenses}
            max={EXPENSES_MAX}
            min={0}
            step={250}
            value={allowableExpenses}
            onChange={(v) => setAllowableExpenses(clamp(v))}
          />
        </div>
      </CollapsibleDrawer>
    </div>
  );

  const content = (
    <div className={section24Content()}>
      {/* Illustration outcomes, not saved figures, so plain outcome cards rather than a KpiStrip.
          One outcome, then at most two supporting figures. */}
      <div className={section24Outcomes()} data-density="compact" data-testid="section-24-outcomes">
        <KpiCard
          label={SECTION24_COPY.kpiTax}
          subtext={section24TaxBreakdown(
            money(result.grossTaxOnProperty),
            money(result.financeCredit),
          )}
          value={tax}
        />
        <KpiCard
          label={SECTION24_COPY.kpiCash}
          subtext={section24CashPerMonth(money(cashLeft / 12))}
          value={<Money size="lg" value={cashLeft} />}
        />
        <KpiCard
          label={SECTION24_COPY.kpiRate}
          subtext={section24RateOf(money(result.section24TaxableProfit))}
          value={
            <Num fractionDigits={1} kind="percent" size="lg" value={result.effectiveTaxRate} />
          }
        />
      </div>

      <div className={section24Explainer()}>
        <h3 className={section24ExplainerTitle()}>{SECTION24_COPY.explainerTitle}</h3>
        <p>{SECTION24_COPY.explainer}</p>
      </div>

      <ProjectionNotice />
      <LiveRegion debounceMs={1000} message={announcement} visuallyHidden />
    </div>
  );

  return (
    <div className={section24Root()} data-testid="section-24-tool">
      <div className={section24Header()}>
        <div className={section24Badges()}>
          <StatusBadge variant="warning">{SECTION24_COPY.unverifiedBadge}</StatusBadge>
        </div>
        <h2 className={section24Title()}>{SECTION24_COPY.title}</h2>
        <p className={section24Intro()}>{SECTION24_COPY.intro}</p>
      </div>

      <SimulatorSplitLayout
        content={content}
        contentLabel={SECTION24_COPY.contentLabel}
        controls={controls}
        controlsLabel={SECTION24_COPY.controlsLabel}
      />

      <Button className={section24Cta()} size="md" variant="primary" onClick={handleSave}>
        {ctaLabel(ctaText)} <Icon icon={ArrowRight} size="sm" />
      </Button>
    </div>
  );
};

export default Section24Calculator;
