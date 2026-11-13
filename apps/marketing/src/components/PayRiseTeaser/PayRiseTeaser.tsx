import {
  calculateUkTax,
  type OnboardingSeedPayload,
  persistOnboardingSeed,
} from "@flump/finance-engine";
import { Button, Card, formatMoney, InlineAlert, SectionBand, SliderField } from "@repo/ui";
import { type FC, useMemo, useState } from "react";
import { FiArrowRight } from "react-icons/fi";
import { signupCta } from "../../utils/site";
import {
  breakdownList,
  breakdownRow,
  breakdownTerm,
  breakdownValue,
  outcomeHeadline,
  outcomeLabel,
  outcomeSub,
  teaserButton,
  teaserCard,
  teaserControls,
  teaserFootnote,
  teaserOutcome,
} from "./PayRiseTeaser.styles";

/** Illustrative starting salary (E31): a typical full-time UK salary, not the £100k band. */
export const DEFAULT_SALARY_GBP = 39_000;
export const DEFAULT_RISE_GBP = 2_000;

/** The Personal Allowance taper band, used only to explain the rate a visitor's own figures hit. */
const TAPER_START_GBP = 100_000;
const TAPER_END_GBP = 125_140;

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

export const PayRiseTeaser: FC = () => {
  const [salary, setSalary] = useState<number>(DEFAULT_SALARY_GBP);
  const [rise, setRise] = useState<number>(DEFAULT_RISE_GBP);
  const cta = signupCta();
  const result = useMemo(() => payRiseResult(salary, rise), [salary, rise]);

  const handleSave = () => {
    const payload: OnboardingSeedPayload = {
      timestamp: Date.now(),
      annualGrossSalary: salary,
      inferredModules: ["budget", "tax", "forecast"],
    };
    // Invite-only: skip the onboarding hand-off, sign-up is closed (E24-T3).
    if (cta.external) persistOnboardingSeed(payload);
    window.location.href = cta.href;
  };

  return (
    <SectionBand
      id="pay-rise"
      tone="tinted"
      indexBadge="UK take-home"
      title="What you keep from a pay rise"
      subtitle="Move the sliders to see an estimate of how much of a rise reaches your pay packet after Income Tax and National Insurance."
    >
      <Card padding="lg" elevation="floating">
        <div className={teaserCard()}>
          <div className={teaserControls()}>
            <SliderField
              label="Current salary (before tax)"
              value={salary}
              min={12_000}
              max={150_000}
              step={500}
              format="currency"
              onChange={setSalary}
            />
            <SliderField
              label="Pay rise (a year)"
              value={rise}
              min={0}
              max={20_000}
              step={250}
              format="currency"
              onChange={setRise}
            />
            <p className={teaserFootnote()}>
              Example only. Uses {result.taxYear} bands for England, Wales and Northern Ireland,
              with no pension contribution or student loan. Your own figures may differ.
            </p>
          </div>

          <div className={teaserOutcome()} aria-live="polite" data-testid="pay-rise-outcome">
            <span className={outcomeLabel()}>Estimated take-home from the rise</span>
            <p className={outcomeHeadline()}>
              {gbp(result.keptAnnual)} a year of {gbp(rise)}
            </p>
            <p className={outcomeSub()}>
              About {gbp(result.keptMonthly)} a month, or {result.keptPct.toFixed(0)}% of the rise.
            </p>

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
              <InlineAlert tone="info" title="Personal Allowance taper">
                Between £100,000 and £125,140, the Personal Allowance reduces by £1 for every £2 of
                income, so less of each extra pound reaches take-home in that band.
              </InlineAlert>
            )}

            <Button size="md" variant="primary" onClick={handleSave} className={teaserButton()}>
              {cta.external ? "Save this salary baseline" : cta.label}{" "}
              <FiArrowRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      </Card>
    </SectionBand>
  );
};

export default PayRiseTeaser;
