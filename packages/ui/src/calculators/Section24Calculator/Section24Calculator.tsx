import { calculateSection24LandlordTax, persistOnboardingSeed } from "@flump/finance-engine";
import type { FC } from "react";
import { useMemo, useState } from "react";
import { Button } from "../../primitives/Button";
import { LiveRegion } from "../../primitives/LiveRegion";
import {
  adornmentStyle,
  badgeRowStyle,
  badgeStyle,
  cardStyle,
  ctaCopyStyle,
  ctaNoteStyle,
  ctaRowStyle,
  ctaTitleStyle,
  headerStyle,
  inputGridStyle,
  inputGroupStyle,
  inputRowStyle,
  inputWrapStyle,
  labelStyle,
  metricCard,
  metricLabelStyle,
  metricNoteStyle,
  metricsGridStyle,
  metricValueStyle,
  numberInputStyle,
  sliderStyle,
  subtitleStyle,
  titleStyle,
} from "./Section24Calculator.styles.js";

const oneDecimalFormatter = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export interface Section24CalculatorProps {
  onSaveAndContinue?: (payload: any) => void;
  ctaText?: string;
  /** When false, entered figures are not written to the onboarding seed in local storage. Default true. */
  persistSeed?: boolean;
}

export const Section24Calculator: FC<Section24CalculatorProps> = ({
  onSaveAndContinue,
  ctaText = "Track your properties in Flump free →",
  persistSeed = true,
}) => {
  const [rentalIncome, setRentalIncome] = useState<number>(18000);
  const [mortgageInterest, setMortgageInterest] = useState<number>(8000);
  const [allowableExpenses, setAllowableExpenses] = useState<number>(2000);
  const [otherIncome, setOtherIncome] = useState<number>(60000);

  const calc = useMemo(() => {
    const res = calculateSection24LandlordTax(
      otherIncome,
      rentalIncome,
      mortgageInterest,
      allowableExpenses,
      100,
    );
    const netCashInPocket =
      res.netRentalIncomeAfterTax ?? Math.max(0, res.actualCashProfit - res.finalTaxDue);
    return {
      ...res,
      netCashInPocket,
    };
  }, [rentalIncome, mortgageInterest, allowableExpenses, otherIncome]);

  const headline = `Estimated tax £${Math.round(calc.finalTaxDue).toLocaleString(
    "en-GB",
  )} a year, leaving £${Math.round(calc.netCashInPocket).toLocaleString("en-GB")} cash in pocket`;

  const handleSave = () => {
    const payload = {
      annualIncome: otherIncome,
      initialCashSavings: 500,
      mortgageBalance: 200000,
      inferredModules: ["tax", "mortgage", "forecast"],
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
    <div className={cardStyle} data-testid="section-24-tool">
      <div className={headerStyle}>
        <div className={badgeRowStyle}>
          <span className={badgeStyle({ tone: "info" })}>
            Estimate using England, Wales and Northern Ireland rates
          </span>
        </div>
        <h2 className={titleStyle}>Section 24 buy-to-let mortgage relief calculator</h2>
        <p className={subtitleStyle}>
          Estimate taxable rental profit and the 20% basic rate tax credit under the finance cost
          restriction introduced by Section 24 of the Finance (No. 2) Act 2015.
        </p>
      </div>

      <div className={inputGridStyle}>
        <div className={inputGroupStyle}>
          <div className={inputRowStyle}>
            <label className={labelStyle} htmlFor="rental-income">
              Gross annual rental income
            </label>
            <div className={inputWrapStyle}>
              <span className={adornmentStyle({ side: "start" })}>£</span>
              <input
                className={numberInputStyle({ tone: "info", width: "lg", adornment: "start" })}
                id="rental-income"
                type="number"
                min={0}
                step={1000}
                value={rentalIncome}
                onChange={(e) => setRentalIncome(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
          </div>
          <input
            className={sliderStyle}
            id="rental-income-slider"
            aria-label="Gross annual rental income slider"
            max={100000}
            min={6000}
            onChange={(e) => setRentalIncome(Number(e.target.value))}
            step={1000}
            type="range"
            value={rentalIncome}
          />
        </div>

        <div className={inputGroupStyle}>
          <div className={inputRowStyle}>
            <label className={labelStyle} htmlFor="mortgage-interest">
              Annual mortgage interest paid
            </label>
            <div className={inputWrapStyle}>
              <span className={adornmentStyle({ side: "start" })}>£</span>
              <input
                className={numberInputStyle({ tone: "danger", width: "lg", adornment: "start" })}
                id="mortgage-interest"
                type="number"
                min={0}
                step={500}
                value={mortgageInterest}
                onChange={(e) => setMortgageInterest(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
          </div>
          <input
            className={sliderStyle}
            id="mortgage-interest-slider"
            aria-label="Annual mortgage interest paid slider"
            max={50000}
            min={0}
            onChange={(e) => setMortgageInterest(Number(e.target.value))}
            step={500}
            type="range"
            value={mortgageInterest}
          />
        </div>

        <div className={inputGroupStyle}>
          <div className={inputRowStyle}>
            <label className={labelStyle} htmlFor="allowable-expenses">
              Other allowable expenses (repairs, agent fees)
            </label>
            <div className={inputWrapStyle}>
              <span className={adornmentStyle({ side: "start" })}>£</span>
              <input
                className={numberInputStyle({ tone: "neutral", width: "md", adornment: "start" })}
                id="allowable-expenses"
                type="number"
                min={0}
                step={250}
                value={allowableExpenses}
                onChange={(e) => setAllowableExpenses(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
          </div>
          <input
            className={sliderStyle}
            id="allowable-expenses-slider"
            aria-label="Other allowable expenses slider"
            max={15000}
            min={0}
            onChange={(e) => setAllowableExpenses(Number(e.target.value))}
            step={250}
            type="range"
            value={allowableExpenses}
          />
        </div>

        <div className={inputGroupStyle}>
          <div className={inputRowStyle}>
            <label className={labelStyle} htmlFor="other-income">
              Other annual taxable income (salary / profits)
            </label>
            <div className={inputWrapStyle}>
              <span className={adornmentStyle({ side: "start" })}>£</span>
              <input
                className={numberInputStyle({ tone: "primary", width: "lg", adornment: "start" })}
                id="other-income"
                type="number"
                min={0}
                step={2500}
                value={otherIncome}
                onChange={(e) => setOtherIncome(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
          </div>
          <input
            className={sliderStyle}
            id="other-income-slider"
            aria-label="Other annual taxable income slider"
            max={150000}
            min={20000}
            onChange={(e) => setOtherIncome(Number(e.target.value))}
            step={2500}
            type="range"
            value={otherIncome}
          />
        </div>
      </div>

      {/* Results */}
      <LiveRegion debounceMs={1000} message={headline} visuallyHidden />
      <div className={metricsGridStyle}>
        <div className={metricCard}>
          <span className={metricLabelStyle}>Estimated Income Tax on rental profit</span>
          <span className={metricValueStyle({ tone: "danger" })}>
            £{Math.round(calc.finalTaxDue).toLocaleString("en-GB")}
          </span>
          <span className={metricNoteStyle}>
            (Gross tax £{Math.round(calc.grossTaxOnProperty).toLocaleString("en-GB")} minus £
            {Math.round(calc.financeCredit).toLocaleString("en-GB")} credit)
          </span>
        </div>

        <div className={metricCard}>
          <span className={metricLabelStyle}>Tax as a share of taxable profit</span>
          <span className={metricValueStyle({ tone: "warning" })}>
            {oneDecimalFormatter.format(calc.effectiveTaxRate)}%
          </span>
          <span className={metricNoteStyle}>
            Of £{Math.round(calc.section24TaxableProfit).toLocaleString("en-GB")} taxable rental
            profit (rent less expenses; mortgage interest is not deducted)
          </span>
        </div>

        <div className={metricCard}>
          <span className={metricLabelStyle}>Rental cash left after tax</span>
          <span className={metricValueStyle({ tone: "positive" })}>
            £{Math.round(calc.netCashInPocket).toLocaleString("en-GB")} / yr
          </span>
          <span className={metricNoteStyle}>
            About £{Math.round(calc.netCashInPocket / 12).toLocaleString("en-GB")} a month after
            expenses, mortgage interest and this tax
          </span>
        </div>
      </div>

      {/* CTA */}
      <div className={ctaRowStyle}>
        <div className={ctaCopyStyle}>
          <span className={ctaTitleStyle}>Keep rental income with the rest of your tax year</span>
          <p className={ctaNoteStyle}>
            In Flump you record rental income and costs yourself, and see an estimate of Section 24,
            your ownership share and payments on account. Flump does not file your tax return.
          </p>
        </div>

        <Button onClick={handleSave} size="lg">
          {ctaText}
        </Button>
      </div>
    </div>
  );
};

export default Section24Calculator;
