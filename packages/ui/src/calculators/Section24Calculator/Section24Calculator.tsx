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
import { DELTA_PANEL_COPY } from "../../patterns/TakeHomeDeltaPanel/copy";
import { Button } from "../../primitives/Button/Button";
import { CollapsibleDrawer } from "../../primitives/CollapsibleDrawer/CollapsibleDrawer";
import { Icon } from "../../primitives/Icon";
import { KpiCard } from "../../primitives/KpiCard/KpiCard";
import { LiveRegion } from "../../primitives/LiveRegion/LiveRegion";
import { formatMoney, Money, Num } from "../../primitives/Money/Money";
import { SliderField } from "../../primitives/SliderField/SliderField";
import { ctaLabel } from "../ctaLabel";
import {
  section24Content,
  section24Controls,
  section24Cta,
  section24DrawerBody,
  section24Explainer,
  section24Header,
  section24Intro,
  section24Note,
  section24Outcomes,
  section24Root,
  section24Title,
} from "./Section24Calculator.styles";

/** Every user-facing string, in one place (COPY-AUDIT, PR 10, Section 24 rows). */
export const SECTION24_COPY = {
  title: "Tax on rental income under Section 24",
  intro:
    "Estimate the tax on rental income when mortgage interest gets a 20% tax credit and is not deducted from profit.",
  rentalIncome: "Rental income a year, before costs",
  mortgageInterest: "Mortgage interest a year",
  otherIncome: "Other taxable income a year",
  otherIncomeHelper: "Salary or profits.",
  otherCosts: "Other allowable costs",
  allowableExpenses: "Other allowable costs a year (repairs, agent fees)",
  kpiTax: "Estimated tax on rental income",
  kpiTaxSubtext: "After the tax credit for mortgage interest.",
  kpiCash: "Estimated cash left a year",
  kpiCashSubtext: "After costs, interest and tax.",
  kpiRate: "Tax share of taxable profit",
  kpiRateSubtext: "Rent less costs, before interest.",
  broughtForwardDrawer: "Unused interest from earlier years",
  broughtForward: "Mortgage interest not yet used from earlier years",
  broughtForwardHelper: "Shown on your last tax return, if you have any.",
  explainerTitle: "How Section 24 works",
  explainer:
    "Mortgage interest is not deducted from rental profit. Instead, the tax is reduced by 20% of the interest. The reduction is at most 20% of the rental profit, or of your income above the Personal Allowance if that is lower. Interest that cannot be used this year carries forward to the next. Rent of £1,000 or less is not taxed. Above that, the estimate takes off the £1,000 property allowance instead of your costs when that gives less tax. Then there is no reduction for interest. The estimate uses England, Wales and Northern Ireland rates for a sole owner. Flump does not file your tax return.",
  explainerMethod:
    "No law sets out the tax on rental income on its own. The estimate is your tax with the rent minus your tax without it.",
  explainerLoss:
    "Tax is worked out before mortgage interest is taken off. So the tax can be more than the cash the property makes, and the cash left can be below zero.",
  controlsLabel: "Rental figures",
  contentLabel: "Estimated tax on rental income",
} as const;

/** Shown under the figures when interest cannot all be used this year (ITTOIA 2005 s.274AA(4)). */
export const section24CarriedForward = (amount: string) =>
  `${amount} of mortgage interest could not be used this year. It carries forward to next year.`;

export const SECTION24_DEFAULT_CTA = "Continue to sign up";

/** Spoken after inputs settle (COPY-AUDIT row for the live region). */
export const section24Announcement = (tax: string, cash: string) =>
  `Illustration: estimated tax on rental income ${tax} a year. Estimated cash left ${cash} a year.`;

const money = (n: number) => formatMoney(n).text;

const RENT_MAX = 100_000;
const INTEREST_MAX = 50_000;
const OTHER_INCOME_MAX = 150_000;
const EXPENSES_MAX = 15_000;
const BROUGHT_FORWARD_MAX = 50_000;

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
  /** Inside a tool page that already shows the title and description: hide this calculator's own title and intro. */
  embedded?: boolean;
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
  embedded = false,
}) => {
  // Clamped so a negative entry never reaches the engine.
  const [rentalIncome, setRentalIncome] = useState(clamp(initialRentalIncome));
  const [mortgageInterest, setMortgageInterest] = useState(clamp(initialMortgageInterest));
  const [allowableExpenses, setAllowableExpenses] = useState(clamp(initialAllowableExpenses));
  const [otherIncome, setOtherIncome] = useState(clamp(initialOtherIncome));
  const [broughtForward, setBroughtForward] = useState(0);

  const result = useMemo(
    () =>
      calculateSection24LandlordTax(
        otherIncome,
        rentalIncome,
        mortgageInterest,
        allowableExpenses,
        100,
        undefined,
        broughtForward,
      ),
    [otherIncome, rentalIncome, mortgageInterest, allowableExpenses, broughtForward],
  );

  const tax = result.finalTaxDue;
  // Can be below zero: under Section 24 a landlord can owe tax and still make a cash loss. Shown
  // with a minus sign in the default tone, never red.
  const cashLeft = result.netRentalIncomeAfterTax;
  const carriedForward = result.financeCostsCarriedForwardGbp;

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
        helperText={SECTION24_COPY.otherIncomeHelper}
        label={SECTION24_COPY.otherIncome}
        max={OTHER_INCOME_MAX}
        min={0}
        step={500}
        value={otherIncome}
        onChange={(v) => setOtherIncome(clamp(v))}
      />
      {/* B14: a quiet drawer button named for what is inside. State lives here, so closing the
          drawer keeps the figure. */}
      <CollapsibleDrawer title={SECTION24_COPY.otherCosts} variant="quiet">
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
      <CollapsibleDrawer title={SECTION24_COPY.broughtForwardDrawer} variant="quiet">
        <div className={section24DrawerBody()}>
          <SliderField
            format="currency"
            helperText={SECTION24_COPY.broughtForwardHelper}
            label={SECTION24_COPY.broughtForward}
            max={BROUGHT_FORWARD_MAX}
            min={0}
            step={250}
            value={broughtForward}
            onChange={(v) => setBroughtForward(clamp(v))}
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
        <KpiCard label={SECTION24_COPY.kpiTax} subtext={SECTION24_COPY.kpiTaxSubtext} value={tax} />
        <KpiCard
          label={SECTION24_COPY.kpiCash}
          subtext={SECTION24_COPY.kpiCashSubtext}
          value={<Money size="lg" tone="default" value={cashLeft} />}
        />
        <KpiCard
          label={SECTION24_COPY.kpiRate}
          subtext={SECTION24_COPY.kpiRateSubtext}
          value={
            <Num fractionDigits={0} kind="percent" size="lg" value={result.effectiveTaxRate} />
          }
        />
      </div>

      {carriedForward > 0 ? (
        <p className={section24Note()}>{section24CarriedForward(money(carriedForward))}</p>
      ) : null}

      <Button className={section24Cta()} size="md" variant="primary" onClick={handleSave}>
        {ctaLabel(ctaText)} <Icon icon={ArrowRight} size="sm" />
      </Button>

      {/* Closed by default: the working adds figures, so it stays out of the first view. */}
      <CollapsibleDrawer title={SECTION24_COPY.explainerTitle} variant="quiet">
        <div className={section24Explainer()}>
          <p>{SECTION24_COPY.explainer}</p>
          <p>{SECTION24_COPY.explainerMethod}</p>
          <p>{SECTION24_COPY.explainerLoss}</p>
        </div>
      </CollapsibleDrawer>

      {/* The one notice, carrying the full "Unverified estimate" sentence (P4.3). */}
      <ProjectionNotice lead={DELTA_PANEL_COPY.unverifiedBanner} />
      <LiveRegion debounceMs={1000} message={announcement} visuallyHidden />
    </div>
  );

  return (
    <div className={section24Root()} data-testid="section-24-tool">
      {/* No "Unverified estimate" badge: the one notice carries the full sentence (P4.3). */}
      {embedded ? null : (
        <div className={section24Header()}>
          <h2 className={section24Title()}>{SECTION24_COPY.title}</h2>
          <p className={section24Intro()}>{SECTION24_COPY.intro}</p>
        </div>
      )}

      <SimulatorSplitLayout
        content={content}
        contentLabel={SECTION24_COPY.contentLabel}
        controls={controls}
        controlsLabel={SECTION24_COPY.controlsLabel}
      />
    </div>
  );
};

export default Section24Calculator;
