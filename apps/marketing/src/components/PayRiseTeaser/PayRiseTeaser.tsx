import {
  calculateUkTax,
  type OnboardingSeedPayload,
  persistOnboardingSeed,
} from "@flump/finance-engine";
import {
  Button,
  Card,
  DELTA_PANEL_COPY,
  formatMoney,
  ProjectionNotice,
  SliderField,
} from "@repo/ui";
import { type FC, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { signupCta } from "../../utils/site";
import { MarketingSection } from "../MarketingSection";
import {
  breakdownList,
  breakdownRow,
  breakdownTerm,
  breakdownValue,
  outcomeHeadline,
  outcomeLabel,
  taperFigure,
  taperNote,
  teaserActions,
  teaserCard,
  teaserControls,
  teaserOutcome,
} from "./PayRiseTeaser.styles";

/** Illustrative starting salary (E31): a typical full-time UK salary, not the £100k band. */
export const DEFAULT_SALARY_GBP = 39_000;
export const DEFAULT_RISE_GBP = 2_000;

/** The full pay-rise tool on this site. */
export const PAY_RISE_TOOL_PATH = "/tools/uk-pay-rise-take-home-calculator";

/** The Personal Allowance taper band, used only to explain the rate a visitor's own figures hit. */
const TAPER_START_GBP = 100_000;
const TAPER_END_GBP = 125_140;

/** "2026/27" as "2026 to 2027" (copy guide 4.3: tax years in words). */
export const taxYearInWords = (taxYear: string): string => {
  const start = Number.parseInt(taxYear.slice(0, 4), 10);
  return Number.isFinite(start) ? `${start} to ${start + 1}` : taxYear;
};

const gbp = (value: number) => formatMoney(value, { fractionDigits: 0 }).text;

export interface PayRiseResult {
  keptAnnual: number;
  keptMonthly: number;
  extraIncomeTax: number;
  extraNationalInsurance: number;
  keptPct: number;
  entersTaperBand: boolean;
  taxYear: string;
}

/** What an employee on PAYE keeps from a rise, England, Wales and NI bands, no pension or loan. */
export function payRiseResult(salary: number, rise: number): PayRiseResult {
  const before = calculateUkTax({ grossSalary: Math.max(0, salary) });
  const after = calculateUkTax({ grossSalary: Math.max(0, salary + rise) });
  const keptAnnual = after.netTakeHomePayAnnualGbp - before.netTakeHomePayAnnualGbp;
  const top = salary + rise;
  return {
    keptAnnual,
    keptMonthly: keptAnnual / 12,
    extraIncomeTax: after.incomeTaxGbp - before.incomeTaxGbp,
    extraNationalInsurance: after.nationalInsuranceGbp - before.nationalInsuranceGbp,
    keptPct: rise > 0 ? (keptAnnual / rise) * 100 : 0,
    entersTaperBand: top > TAPER_START_GBP && salary < TAPER_END_GBP,
    taxYear: after.taxYear,
  };
}

/**
 * The home page's one live teaser (E16 PR 12): two sliders, one outcome figure and two supporting
 * rows (P1), and the page's single notice, with the "Unverified estimate" lead (ruling 3, R6).
 */
export const PayRiseTeaser: FC = () => {
  const [salary, setSalary] = useState<number>(DEFAULT_SALARY_GBP);
  const [rise, setRise] = useState<number>(DEFAULT_RISE_GBP);
  const cta = signupCta();
  const result = useMemo(() => payRiseResult(salary, rise), [salary, rise]);

  // Open sign-up only: hand the visitor's own salary to onboarding. Invite-only stores nothing.
  const handleStart = () => {
    const payload: OnboardingSeedPayload = {
      timestamp: Date.now(),
      annualGrossSalary: salary,
      inferredModules: ["budget", "tax", "forecast"],
    };
    persistOnboardingSeed(payload);
    window.location.href = cta.href;
  };

  return (
    <MarketingSection
      id="pay-rise"
      subtitle="Move the sliders to see an estimate of how much of a rise reaches your pay after Income Tax and National Insurance."
      title="What you keep from a pay rise"
    >
      <Card padding="lg">
        <div className={teaserCard()}>
          <div className={teaserControls()}>
            <SliderField
              format="currency"
              label="Salary before tax"
              max={150_000}
              min={12_000}
              step={500}
              value={salary}
              onChange={setSalary}
            />
            <SliderField
              format="currency"
              label="Pay rise (a year)"
              max={20_000}
              min={0}
              step={250}
              value={rise}
              onChange={setRise}
            />
          </div>

          <div className={teaserOutcome()} data-testid="pay-rise-outcome">
            <span className={outcomeLabel()}>Estimated take-home from the rise</span>
            <div aria-atomic="true" aria-live="polite">
              <p className={outcomeHeadline()}>{gbp(result.keptAnnual)} a year</p>
            </div>

            <dl className={breakdownList()}>
              <div className={breakdownRow()}>
                <dt className={breakdownTerm()}>Extra Income Tax</dt>
                <dd className={breakdownValue()}>{gbp(result.extraIncomeTax)}</dd>
              </div>
              <div className={breakdownRow()}>
                <dt className={breakdownTerm()}>Extra National Insurance</dt>
                <dd className={breakdownValue()}>{gbp(result.extraNationalInsurance)}</dd>
              </div>
            </dl>

            {result.entersTaperBand && (
              <p className={taperNote()} data-testid="pay-rise-taper-note">
                Between <span className={taperFigure()}>£100,000</span> and{" "}
                <span className={taperFigure()}>£125,140</span>, the Personal Allowance reduces by{" "}
                <span className={taperFigure()}>£1</span> for every{" "}
                <span className={taperFigure()}>£2</span> of income. Less of each extra pound
                reaches take-home pay in that band.
              </p>
            )}

            <div className={teaserActions()}>
              {cta.external ? (
                <Button size="md" variant="outline" onClick={handleStart}>
                  Start with this salary
                </Button>
              ) : (
                <Button asChild size="md" variant="outline">
                  <Link to={PAY_RISE_TOOL_PATH}>Open the full calculator</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
        <ProjectionNotice
          lead={
            <>
              {DELTA_PANEL_COPY.unverifiedBanner}{" "}
              <span data-testid="pay-rise-assumptions">
                Uses {taxYearInWords(result.taxYear)} rates outside Scotland, with no pension or
                student loan.
              </span>
            </>
          }
        />
      </Card>
    </MarketingSection>
  );
};

export default PayRiseTeaser;
