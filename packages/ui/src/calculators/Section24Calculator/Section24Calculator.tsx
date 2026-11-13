import { calculateSection24LandlordTax, persistOnboardingSeed } from "@flump/finance-engine";
import type { FC } from "react";
import { useMemo, useState } from "react";
import { FiArrowRight } from "react-icons/fi";
import { Button } from "../../primitives/Button";
import { LiveRegion } from "../../primitives/LiveRegion";
import {
  adornmentStyle,
  badgeRowStyle,
  badgeStyle,
  cardStyle,
  ctaCopyStyle,
  ctaIconStyle,
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

export interface Section24CalculatorProps {
  onSaveAndContinue?: (payload: any) => void;
  ctaText?: string;
}

export const Section24Calculator: FC<Section24CalculatorProps> = ({
  onSaveAndContinue,
  ctaText = "Track your properties in Flump free →",
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

  const headline = `Tax due £${Math.round(calc.finalTaxDue).toLocaleString(
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
    persistOnboardingSeed(payload as any);
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
          <span className={badgeStyle({ tone: "info" })}>HMRC Landlord Tax Rules</span>
        </div>
        <h2 className={titleStyle}>Section 24 buy-to-let mortgage relief calculator</h2>
        <p className={subtitleStyle}>
          Calculate phantom taxable rental profit and the 20% basic rate tax credit reduction
          introduced by Section 24 of the Finance (No. 2) Act 2015.
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
                onChange={(e) => setRentalIncome(Number(e.target.value) || 0)}
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
                onChange={(e) => setMortgageInterest(Number(e.target.value) || 0)}
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
                onChange={(e) => setAllowableExpenses(Number(e.target.value) || 0)}
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
                onChange={(e) => setOtherIncome(Number(e.target.value) || 0)}
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
          <span className={metricLabelStyle}>HMRC tax due on rental</span>
          <span className={metricValueStyle({ tone: "danger" })}>
            £{Math.round(calc.finalTaxDue).toLocaleString("en-GB")}
          </span>
          <span className={metricNoteStyle}>
            (Gross tax £{Math.round(calc.grossTaxOnProperty).toLocaleString("en-GB")} minus £
            {Math.round(calc.financeCredit).toLocaleString("en-GB")} credit)
          </span>
        </div>

        <div className={metricCard}>
          <span className={metricLabelStyle}>True effective tax rate</span>
          <span className={metricValueStyle({ tone: "warning" })}>{calc.effectiveTaxRate}%</span>
          <span className={metricNoteStyle}>
            Tax paid relative to your £{Math.round(calc.actualCashProfit).toLocaleString("en-GB")}{" "}
            real cash profit
          </span>
        </div>

        <div className={metricCard}>
          <span className={metricLabelStyle}>Net cash retained</span>
          <span className={metricValueStyle({ tone: "positive" })}>
            £{Math.round(calc.netCashInPocket).toLocaleString("en-GB")} / yr
          </span>
          <span className={metricNoteStyle}>
            £{Math.round(calc.netCashInPocket / 12).toLocaleString("en-GB")}/mo cash in pocket after
            tax & mortgage
          </span>
        </div>
      </div>

      {/* CTA */}
      <div className={ctaRowStyle}>
        <div className={ctaCopyStyle}>
          <span className={ctaTitleStyle}>
            Need automated HMRC Self-Assessment & property tax tracking?
          </span>
          <p className={ctaNoteStyle}>
            Flump automatically models Section 24 adjustments, joint spousal splits, and Payments on
            Account.
          </p>
        </div>

        <Button onClick={handleSave} size="lg">
          {ctaText} <FiArrowRight aria-hidden="true" className={ctaIconStyle} />
        </Button>
      </div>
    </div>
  );
};

export default Section24Calculator;
