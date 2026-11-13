import { calculateTaxTrapRelief, persistOnboardingSeed } from "@flump/finance-engine";
import { ArrowRight, CircleCheck, TriangleAlert } from "lucide-react";
import type { FC } from "react";
import { useMemo, useState } from "react";
import { Button } from "../../primitives/Button";
import { Icon } from "../../primitives/Icon";
import { LiveRegion } from "../../primitives/LiveRegion";
import {
  badgeRowStyle,
  badgeStyle,
  cardStyle,
  childcareIconStyle,
  childcareStyle,
  ctaIconStyle,
  ctaStyle,
  estimateNoteStyle,
  fieldLabelStyle,
  fieldRowStyle,
  headerStyle,
  inputGroupStyle,
  introStyle,
  metricCard,
  metricLabelStyle,
  metricNoteStyle,
  metricsGridStyle,
  metricValueStyle,
  pillInputStyle,
  pillPrefixStyle,
  pillWrapStyle,
  scaleLabelsStyle,
  sliderStyle,
  titleStyle,
} from "./TaxTrapCalculator.styles.js";

export interface TaxTrapCalculatorProps {
  onSaveAndContinue?: (payload: any) => void;
  ctaText?: string;
  /** When false, entered figures are not written to the onboarding seed in local storage. Default true. */
  persistSeed?: boolean;
  /** Tax year the figures are for. Defaults to the year the trap maths is written for. */
  taxYear?: string;
}

const gbp = (value: number) => `£${value.toLocaleString("en-GB")}`;
// TODO: derive from the engine (getUkTaxYearContext) once calculateTaxTrapRelief takes a year.
const DEFAULT_TAX_YEAR = "2026/27";

export const TaxTrapCalculator: FC<TaxTrapCalculatorProps> = ({
  onSaveAndContinue,
  ctaText = "Save scenario and continue free →",
  persistSeed = true,
  taxYear: TAX_YEAR = DEFAULT_TAX_YEAR,
}) => {
  const [grossIncome, setGrossIncome] = useState<number>(115000);
  const [salarySacrifice, setSalarySacrifice] = useState<number>(10000);

  const analysis = useMemo(() => {
    return calculateTaxTrapRelief(grossIncome);
  }, [grossIncome]);

  const allowanceReclaimed = Math.min(
    analysis.lostPersonalAllowance,
    Math.round(salarySacrifice / 2),
  );

  const inTrapSacrifice = Math.min(analysis.excessAbove100k, salarySacrifice);
  const aboveTrapSacrifice = Math.max(0, salarySacrifice - analysis.excessAbove100k);
  const totalTaxSaved = Math.round(inTrapSacrifice * 0.62 + aboveTrapSacrifice * 0.42);

  const maxSacrifice = Math.min(60000, Math.max(0, grossIncome - 20000));
  const isTrapZone = grossIncome > 100000;
  const netIncomeAfterSacrifice = Math.max(0, grossIncome - salarySacrifice);
  const stillInTrap = isTrapZone && salarySacrifice < analysis.excessAbove100k;
  const childcareEligible = netIncomeAfterSacrifice <= 100000;

  const headline = `Estimated tax and NI saved £${totalTaxSaved.toLocaleString("en-GB")}`;

  const handleSave = () => {
    const payload = {
      annualIncome: grossIncome,
      initialCashSavings: 1000,
      mortgageBalance: 250000,
      inferredModules: ["tax", "pension", "forecast"],
      timestamp: Date.now(),
    };
    if (persistSeed) persistOnboardingSeed(payload as any);
    if (onSaveAndContinue) {
      onSaveAndContinue(payload);
    } else if (typeof window !== "undefined") {
      window.location.href = "/signup";
    }
  };

  return (
    <div className={cardStyle} data-testid="tax-trap-calculator-tool">
      <div className={headerStyle}>
        <div className={badgeRowStyle}>
          <span className={badgeStyle({ tone: "brand" })}>UK {TAX_YEAR} tax engine</span>
          {isTrapZone && (
            <span className={badgeStyle({ tone: "danger" })}>
              <Icon icon={TriangleAlert} size="sm" /> 60% trap active
            </span>
          )}
        </div>
        <h2 className={titleStyle}>Interactive £100k–£125k tax trap modeller</h2>
        <p className={introStyle}>
          Slide your income and test how salary sacrifice or SIPP contributions reclaim your
          personal allowance and unlock tax-free childcare.
        </p>
      </div>

      <div className={inputGroupStyle}>
        <div className={fieldRowStyle}>
          <label htmlFor="gross-income-input" className={fieldLabelStyle}>
            Total gross UK income
          </label>
          <div className={pillWrapStyle}>
            <span className={pillPrefixStyle}>£</span>
            <input
              id="gross-income-input"
              className={pillInputStyle({ tone: "primary" })}
              type="number"
              min={0}
              step={500}
              value={grossIncome}
              onChange={(e) => setGrossIncome(Number(e.target.value) || 0)}
            />
          </div>
        </div>
        <input
          id="gross-income-slider"
          aria-label="Total gross UK income slider"
          className={sliderStyle}
          max={150000}
          min={90000}
          step={500}
          type="range"
          value={grossIncome}
          onChange={(e) => setGrossIncome(Number(e.target.value))}
        />
        <div className={scaleLabelsStyle}>
          <span>£90k (40% higher rate)</span>
          <span>£100k (trap starts)</span>
          <span>£125,140 (zero allowance)</span>
          <span>£150k</span>
        </div>
      </div>

      <div className={inputGroupStyle}>
        <div className={fieldRowStyle}>
          <label htmlFor="sacrifice-input" className={fieldLabelStyle}>
            Annual pension salary sacrifice / SIPP contribution
          </label>
          <div className={pillWrapStyle}>
            <span className={pillPrefixStyle}>£</span>
            <input
              id="sacrifice-input"
              className={pillInputStyle({ tone: "positive" })}
              type="number"
              min={0}
              max={maxSacrifice}
              step={500}
              value={salarySacrifice}
              onChange={(e) => setSalarySacrifice(Number(e.target.value) || 0)}
            />
          </div>
        </div>
        <input
          id="sacrifice-slider"
          aria-label="Annual pension salary sacrifice slider"
          className={sliderStyle}
          max={maxSacrifice}
          min={0}
          step={500}
          type="range"
          value={salarySacrifice}
          onChange={(e) => setSalarySacrifice(Number(e.target.value))}
        />
      </div>

      <LiveRegion debounceMs={1000} message={headline} visuallyHidden />
      <div className={metricsGridStyle}>
        <div className={metricCard}>
          <span className={metricLabelStyle}>Effective marginal rate</span>
          <span className={metricValueStyle({ tone: stillInTrap ? "danger" : "positive" })}>
            {stillInTrap ? "62.0%" : "42.0%"}
          </span>
          <span className={metricNoteStyle}>40% income tax + 20% taper + 2% NI</span>
        </div>

        <div className={metricCard}>
          <span className={metricLabelStyle}>Estimated tax and NI saved</span>
          <span className={metricValueStyle({ tone: "positive" })}>{gbp(totalTaxSaved)}</span>
          <span className={metricNoteStyle}>Estimate, not a guarantee</span>
        </div>

        <div className={metricCard}>
          <span className={metricLabelStyle}>Personal allowance reclaimed</span>
          <span className={metricValueStyle({ tone: "primary" })}>{gbp(allowanceReclaimed)}</span>
          <span className={metricNoteStyle}>
            of {gbp(analysis.lostPersonalAllowance)} lost allowance
          </span>
        </div>
      </div>

      <p data-testid="tax-trap-estimate-note" className={estimateNoteStyle}>
        Estimate for {TAX_YEAR}, based on the figures you entered. Assumes {TAX_YEAR} England, Wales
        and Northern Ireland rates; Scotland differs.
      </p>

      <div className={childcareStyle({ eligible: childcareEligible })}>
        <Icon
          icon={childcareEligible ? CircleCheck : TriangleAlert}
          className={childcareIconStyle({ eligible: childcareEligible })}
        />
        <span>
          {childcareEligible
            ? "Eligible for 15–30 hours of funded childcare and Tax-Free Childcare (adjusted net income ≤ £100k)"
            : "Childcare cliff edge triggered: adjusted net income exceeds £100,000, so all funded hours are lost."}
        </span>
      </div>

      <Button className={ctaStyle} variant="primary" size="md" onClick={handleSave}>
        {ctaText} <Icon icon={ArrowRight} size="sm" className={ctaIconStyle} />
      </Button>
    </div>
  );
};

export default TaxTrapCalculator;
