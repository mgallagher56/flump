import { calculateMortgageVsIsa, persistOnboardingSeed } from "@flump/finance-engine";
import type { FC } from "react";
import { useMemo, useState } from "react";
import { FiHome, FiTrendingUp } from "react-icons/fi";
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

const oneDecimalFormatter = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export interface MortgageVsIsaCalculatorProps {
  onSaveAndContinue?: (payload: any) => void;
  ctaText?: string;
  /** When false, entered figures are not written to the onboarding seed in local storage. Default true. */
  persistSeed?: boolean;
}

export const MortgageVsIsaCalculator: FC<MortgageVsIsaCalculatorProps> = ({
  onSaveAndContinue,
  ctaText = "Model your mortgage in Flump free →",
  persistSeed = true,
}) => {
  const [mortgageBalance, setMortgageBalance] = useState<number>(240000);
  const [interestRate, setInterestRate] = useState<number>(4.5);
  const [remainingYears, setRemainingYears] = useState<number>(20);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(350);
  const [isaExpectedReturn, setIsaExpectedReturn] = useState<number>(7.0);

  // All maths is the engine's (calculateMortgageVsIsa); the component only formats it.
  const simulation = useMemo(() => {
    const res = calculateMortgageVsIsa(
      Math.max(0, mortgageBalance),
      Math.max(0, interestRate),
      Math.max(1, remainingYears),
      Math.max(0, monthlyContribution),
      Math.max(0, isaExpectedReturn),
    );
    return {
      interestSaved: res.interestSaved,
      yearsShaved: Number(res.yearsShaved),
      isaPot: res.isaAccumulatedValue,
      isaGrowth: res.isaGrowth,
      isaNetAdvantage: res.netWealthDelta,
    };
  }, [mortgageBalance, interestRate, remainingYears, monthlyContribution, isaExpectedReturn]);

  const headline = `Overpaying would save an estimated £${Math.round(
    simulation.interestSaved,
  ).toLocaleString(
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
    if (persistSeed) persistOnboardingSeed(payload as any);
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
          <span className={badgeStyle({ tone: "warning" })}>Estimate</span>
        </div>
        <h2 className={titleStyle}>Mortgage overpayment vs Stocks and Shares ISA</h2>
        <p className={subtitleStyle}>
          Compare the interest a monthly overpayment would save at your mortgage rate with what the
          same amount might grow to in a Stocks and Shares ISA at a return you choose. ISA returns
          are not guaranteed and can be negative.
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
                onChange={(e) => setMortgageBalance(Math.max(0, Number(e.target.value) || 0))}
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
                onChange={(e) => setInterestRate(Math.max(0, Number(e.target.value) || 0))}
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
            <label className={labelStyle} htmlFor="mortgage-term">
              Remaining mortgage term
            </label>
            <div className={inputWrapStyle}>
              <input
                className={numberInputStyle({ tone: "warning", width: "sm", adornment: "end" })}
                id="mortgage-term"
                type="number"
                min={1}
                max={40}
                step={1}
                value={remainingYears}
                onChange={(e) =>
                  setRemainingYears(
                    Math.min(40, Math.max(1, Math.round(Number(e.target.value)) || 1)),
                  )
                }
              />
              <span className={unitStyle}>years</span>
            </div>
          </div>
          <input
            className={sliderStyle}
            id="mortgage-term-slider"
            aria-label="Remaining mortgage term slider"
            max={35}
            min={5}
            onChange={(e) => setRemainingYears(Number(e.target.value))}
            step={1}
            type="range"
            value={remainingYears}
          />
        </div>

        <div className={inputGroupStyle}>
          <div className={inputRowStyle}>
            <label className={labelStyle} htmlFor="monthly-extra">
              Monthly overpayment
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
                onChange={(e) => setMonthlyContribution(Math.max(0, Number(e.target.value) || 0))}
              />
              <span className={unitStyle}>/mo</span>
            </div>
          </div>
          <input
            className={sliderStyle}
            id="monthly-extra-slider"
            aria-label="Monthly overpayment slider"
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
                onChange={(e) => setIsaExpectedReturn(Math.max(0, Number(e.target.value) || 0))}
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
            <span className={metricLabelStyle}>Mortgage interest saved</span>
          </div>
          <span className={metricValueStyle({ tone: "warning" })}>
            £{Math.round(simulation.interestSaved).toLocaleString("en-GB")}
          </span>
          <span className={metricNoteStyle}>
            Estimate. The mortgage would end about{" "}
            {oneDecimalFormatter.format(simulation.yearsShaved)} years sooner, if the rate stays the
            same
          </span>
        </div>

        <div className={metricCard}>
          <div className={metricHeaderStyle}>
            <FiTrendingUp
              aria-hidden="true"
              className={metricIconStyle({ tone: "positive" })}
              size={14}
            />
            <span className={metricLabelStyle}>Stocks and Shares ISA value</span>
          </div>
          <span className={metricValueStyle({ tone: "positive" })}>
            £{Math.round(simulation.isaPot).toLocaleString("en-GB")}
          </span>
          <span className={metricNoteStyle}>
            Estimate, including £{Math.round(simulation.isaGrowth).toLocaleString("en-GB")} of
            growth at the return you chose
          </span>
        </div>

        <div className={metricCard}>
          <span className={metricLabelStyle}>Difference between the two</span>
          <span className={metricValueStyle({ tone: "neutral" })}>
            {simulation.isaNetAdvantage >= 0 ? "+" : "−"}£
            {Math.abs(Math.round(simulation.isaNetAdvantage)).toLocaleString("en-GB")}
          </span>
          <span className={metricNoteStyle}>
            {simulation.isaNetAdvantage >= 0
              ? "ISA growth above the interest saved, in this estimate"
              : "Interest saved above the ISA growth, in this estimate"}
          </span>
        </div>
      </div>
      <p className={metricNoteStyle}>
        Both are compared over the remaining term you set. The estimate does not count investing the
        mortgage payment once the mortgage is cleared early, charges, or early repayment limits on
        your mortgage.
      </p>

      {/* CTA */}
      <div className={ctaRowStyle}>
        <div className={ctaCopyStyle}>
          <span className={ctaTitleStyle}>Keep your mortgage alongside the rest of your money</span>
          <p className={ctaNoteStyle}>
            In Flump you enter your mortgage balance and fixed-rate end date yourself and see them
            next to your savings, debts and pension.
          </p>
        </div>

        <Button onClick={handleSave} size="lg">
          {ctaText}
        </Button>
      </div>
    </div>
  );
};

export default MortgageVsIsaCalculator;
