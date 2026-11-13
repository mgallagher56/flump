import { persistOnboardingSeed } from "@flump/finance-engine";
import type { FC } from "react";
import { useMemo, useState } from "react";
import { FiArrowRight, FiHome, FiTrendingUp } from "react-icons/fi";
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
  metricHeaderStyle,
  metricIconStyle,
  metricLabelStyle,
  metricNoteStyle,
  metricsGridStyle,
  metricValueStyle,
  numberInputStyle,
  sliderStyle,
  subtitleStyle,
  titleStyle,
  unitStyle,
} from "./MortgageVsIsaCalculator.styles.js";

export interface MortgageVsIsaCalculatorProps {
  onSaveAndContinue?: (payload: any) => void;
  ctaText?: string;
}

export const MortgageVsIsaCalculator: FC<MortgageVsIsaCalculatorProps> = ({
  onSaveAndContinue,
  ctaText = "Model your mortgage in Flump free →",
}) => {
  const [mortgageBalance, setMortgageBalance] = useState<number>(240000);
  const [interestRate, setInterestRate] = useState<number>(4.5);
  const [remainingYears, setRemainingYears] = useState<number>(20);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(350);
  const [isaExpectedReturn, setIsaExpectedReturn] = useState<number>(7.0);

  const simulation = useMemo(() => {
    const months = remainingYears * 12;
    const monthlyRate = interestRate / 100 / 12;
    const monthlyIsaRate = isaExpectedReturn / 100 / 12;

    // Standard mortgage monthly payment
    const standardPayment =
      monthlyRate > 0
        ? (mortgageBalance * monthlyRate * (1 + monthlyRate) ** months) /
          ((1 + monthlyRate) ** months - 1)
        : mortgageBalance / months;

    // 1. Overpayment amortization
    let bal = mortgageBalance;
    let totalInterestOverpay = 0;
    let monthsToZero = 0;
    for (let m = 1; m <= months; m++) {
      if (bal <= 0) break;
      const interest = bal * monthlyRate;
      totalInterestOverpay += interest;
      const principal = Math.min(bal, standardPayment + monthlyContribution - interest);
      bal -= principal;
      monthsToZero = m;
    }

    // Standard total interest without overpayment
    let standardBal = mortgageBalance;
    let totalStandardInterest = 0;
    for (let m = 1; m <= months; m++) {
      if (standardBal <= 0) break;
      const interest = standardBal * monthlyRate;
      totalStandardInterest += interest;
      const principal = Math.min(standardBal, standardPayment - interest);
      standardBal -= principal;
    }

    const interestSaved = Math.max(0, totalStandardInterest - totalInterestOverpay);
    const monthsShaved = Math.max(0, months - monthsToZero);
    const yearsShaved = (monthsShaved / 12).toFixed(1);

    // 2. ISA compound investment pot
    let isaPot = 0;
    for (let m = 1; m <= months; m++) {
      isaPot = (isaPot + monthlyContribution) * (1 + monthlyIsaRate);
    }
    const totalIsaContributed = monthlyContribution * months;
    const isaGrowth = Math.max(0, isaPot - totalIsaContributed);

    // Net advantage of ISA over mortgage interest saved
    const isaNetAdvantage = isaPot - (totalIsaContributed + interestSaved);

    return {
      standardPayment,
      interestSaved,
      yearsShaved,
      isaPot,
      isaGrowth,
      isaNetAdvantage,
    };
  }, [mortgageBalance, interestRate, remainingYears, monthlyContribution, isaExpectedReturn]);

  const headline = `Overpaying saves £${Math.round(simulation.interestSaved).toLocaleString(
    "en-GB",
  )} interest; the ISA would grow to £${Math.round(simulation.isaPot).toLocaleString("en-GB")}`;

  const handleSave = () => {
    const payload = {
      annualIncome: 75000,
      monthlyContribution,
      mortgageBalance,
      inferredModules: ["mortgage", "accounts", "forecast"],
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
    <div className={cardStyle} data-testid="mortgage-vs-isa-tool">
      <div className={headerStyle}>
        <div className={badgeRowStyle}>
          <span className={badgeStyle({ tone: "warning" })}>UK Mortgage & Wealth Engine</span>
        </div>
        <h2 className={titleStyle}>Mortgage overpayment vs stocks and shares ISA comparator</h2>
        <p className={subtitleStyle}>
          Mathematically compare the guaranteed interest savings of mortgage overpayments against
          the compound returns of a tax-sheltered UK Stocks & Shares ISA.
        </p>
      </div>

      <div className={inputGridStyle}>
        <div className={inputGroupStyle}>
          <div className={inputRowStyle}>
            <label className={labelStyle} htmlFor="mortgage-bal">
              Mortgage balance
            </label>
            <div className={inputWrapStyle}>
              <span className={adornmentStyle({ side: "start" })}>£</span>
              <input
                className={numberInputStyle({ tone: "warning", width: "lg", adornment: "start" })}
                id="mortgage-bal"
                type="number"
                min={0}
                step={5000}
                value={mortgageBalance}
                onChange={(e) => setMortgageBalance(Number(e.target.value) || 0)}
              />
            </div>
          </div>
          <input
            className={sliderStyle}
            id="mortgage-bal-slider"
            aria-label="Mortgage balance slider"
            max={750000}
            min={50000}
            onChange={(e) => setMortgageBalance(Number(e.target.value))}
            step={5000}
            type="range"
            value={mortgageBalance}
          />
        </div>

        <div className={inputGroupStyle}>
          <div className={inputRowStyle}>
            <label className={labelStyle} htmlFor="mortgage-rate">
              Mortgage interest rate
            </label>
            <div className={inputWrapStyle}>
              <input
                className={numberInputStyle({ tone: "warning", width: "sm", adornment: "end" })}
                id="mortgage-rate"
                type="number"
                min={0}
                max={20}
                step={0.1}
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value) || 0)}
              />
              <span className={adornmentStyle({ side: "end" })}>%</span>
            </div>
          </div>
          <input
            className={sliderStyle}
            id="mortgage-rate-slider"
            aria-label="Mortgage interest rate slider"
            max={8.0}
            min={1.5}
            onChange={(e) => setInterestRate(Number(e.target.value))}
            step={0.1}
            type="range"
            value={interestRate}
          />
        </div>

        <div className={inputGroupStyle}>
          <div className={inputRowStyle}>
            <label className={labelStyle} htmlFor="monthly-extra">
              Monthly extra cash
            </label>
            <div className={inputWrapStyle}>
              <span className={adornmentStyle({ side: "start" })}>£</span>
              <input
                className={numberInputStyle({ tone: "primary", width: "md", adornment: "start" })}
                id="monthly-extra"
                type="number"
                min={0}
                step={25}
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(Number(e.target.value) || 0)}
              />
              <span className={unitStyle}>/mo</span>
            </div>
          </div>
          <input
            className={sliderStyle}
            id="monthly-extra-slider"
            aria-label="Monthly extra cash slider"
            max={1500}
            min={50}
            onChange={(e) => setMonthlyContribution(Number(e.target.value))}
            step={25}
            type="range"
            value={monthlyContribution}
          />
        </div>

        <div className={inputGroupStyle}>
          <div className={inputRowStyle}>
            <label className={labelStyle} htmlFor="isa-return">
              Expected Stocks and Shares ISA return
            </label>
            <div className={inputWrapStyle}>
              <input
                className={numberInputStyle({ tone: "positive", width: "sm", adornment: "end" })}
                id="isa-return"
                type="number"
                min={0}
                max={25}
                step={0.25}
                value={isaExpectedReturn}
                onChange={(e) => setIsaExpectedReturn(Number(e.target.value) || 0)}
              />
              <span className={adornmentStyle({ side: "end" })}>%</span>
            </div>
          </div>
          <input
            className={sliderStyle}
            id="isa-return-slider"
            aria-label="Expected Stocks and Shares ISA return slider"
            max={12.0}
            min={3.0}
            onChange={(e) => setIsaExpectedReturn(Number(e.target.value))}
            step={0.25}
            type="range"
            value={isaExpectedReturn}
          />
        </div>
      </div>

      {/* Results */}
      <LiveRegion debounceMs={1000} message={headline} visuallyHidden />
      <div className={metricsGridStyle}>
        <div className={metricCard}>
          <div className={metricHeaderStyle}>
            <FiHome aria-hidden="true" className={metricIconStyle({ tone: "warning" })} size={14} />
            <span className={metricLabelStyle}>Mortgage Overpay</span>
          </div>
          <span className={metricValueStyle({ tone: "warning" })}>
            Save £{Math.round(simulation.interestSaved).toLocaleString("en-GB")}
          </span>
          <span className={metricNoteStyle}>
            Shaves ~{simulation.yearsShaved} years off loan term
          </span>
        </div>

        <div className={metricCard}>
          <div className={metricHeaderStyle}>
            <FiTrendingUp
              aria-hidden="true"
              className={metricIconStyle({ tone: "positive" })}
              size={14}
            />
            <span className={metricLabelStyle}>Stocks and shares ISA pot</span>
          </div>
          <span className={metricValueStyle({ tone: "positive" })}>
            £{Math.round(simulation.isaPot).toLocaleString("en-GB")}
          </span>
          <span className={metricNoteStyle}>
            Includes £{Math.round(simulation.isaGrowth).toLocaleString("en-GB")} in tax-free returns
          </span>
        </div>

        <div className={metricCard}>
          <span className={metricLabelStyle}>ISA net wealth spread</span>
          <span
            className={metricValueStyle({
              tone: simulation.isaNetAdvantage >= 0 ? "positive" : "danger",
            })}
          >
            {simulation.isaNetAdvantage >= 0 ? "+" : ""}£
            {Math.round(simulation.isaNetAdvantage).toLocaleString("en-GB")}
          </span>
          <span className={metricNoteStyle}>
            {simulation.isaNetAdvantage >= 0
              ? "Expected net wealth gain from investing"
              : "Overpaying mortgage yields higher return"}
          </span>
        </div>
      </div>

      {/* CTA */}
      <div className={ctaRowStyle}>
        <div className={ctaCopyStyle}>
          <span className={ctaTitleStyle}>
            Ready to track your mortgage deal expiry & live ISA yields?
          </span>
          <p className={ctaNoteStyle}>
            Flump syncs your live balance and monitors fixed-rate renewal dates automatically.
          </p>
        </div>

        <Button onClick={handleSave} size="lg">
          {ctaText} <FiArrowRight aria-hidden="true" className={ctaIconStyle} />
        </Button>
      </div>
    </div>
  );
};

export default MortgageVsIsaCalculator;
