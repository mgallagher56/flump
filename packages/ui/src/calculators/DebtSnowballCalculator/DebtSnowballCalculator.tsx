import {
  compareAvalancheAndSnowball,
  type DebtItem,
  persistOnboardingSeed,
} from "@flump/finance-engine";
import type { FC } from "react";
import { useMemo, useState } from "react";
import { Button } from "../../primitives/Button";
import { LiveRegion } from "../../primitives/LiveRegion";
import {
  captionStyle,
  cardStyle,
  ctaStyle,
  fieldLabelStyle,
  gridStyle,
  headerRowStyle,
  heroFigureStyle,
  inputGroupStyle,
  introStyle,
  liabilityCardStyle,
  liabilityFieldsStyle,
  liabilityTitleStyle,
  pillInputStyle,
  pillPrefixStyle,
  pillSuffixStyle,
  pillWrapStyle,
  rangeStyle,
  resultsBoxStyle,
  savedBoxStyle,
  savedFigureStyle,
  savedLabelStyle,
  snowballWinStyle,
  surplusLabelStyle,
  surplusRowStyle,
  tagStyle,
  textInputStyle,
  titleStyle,
} from "./DebtSnowballCalculator.styles.js";

export interface DebtSnowballCalculatorProps {
  onSaveAndContinue?: (payload: any) => void;
  ctaText?: string;
  /** When false, entered figures are not written to the onboarding seed in local storage. Default true. */
  persistSeed?: boolean;
}

export const DebtSnowballCalculator: FC<DebtSnowballCalculatorProps> = ({
  onSaveAndContinue,
  ctaText = "Track live in Flump free →",
  persistSeed = true,
}) => {
  const [cardBalance, setCardBalance] = useState<number>(3500);
  const [cardApr, setCardApr] = useState<number>(24.9);
  const [cardMin, setCardMin] = useState<number>(90);

  const [loanBalance, setLoanBalance] = useState<number>(5000);
  const [loanApr, setLoanApr] = useState<number>(8.5);
  const [loanMin, setLoanMin] = useState<number>(140);

  const [extraPayment, setExtraPayment] = useState<number>(75);

  const debts = useMemo<DebtItem[]>(() => {
    return [
      {
        id: "d1",
        name: "credit card",
        balance: cardBalance,
        apr: cardApr,
        minimumPayment: cardMin,
        type: "credit_card",
      },
      {
        id: "d2",
        name: "personal loan",
        balance: loanBalance,
        apr: loanApr,
        minimumPayment: loanMin,
        type: "loan",
      },
    ];
  }, [cardBalance, cardApr, cardMin, loanBalance, loanApr, loanMin]);

  const comparison = useMemo(() => {
    return compareAvalancheAndSnowball(debts, extraPayment);
  }, [debts, extraPayment]);

  const headline = comparison.avalanche.payoffAchievable
    ? `Debt-free by ${comparison.avalanche.debtFreeDate}, total interest £${Math.round(
        comparison.avalanche.totalInterest,
      ).toLocaleString("en-GB")}`
    : "These payments would not clear the debts";

  const handleSave = () => {
    const totalDebt = cardBalance + loanBalance;
    const payload = {
      mode: "DEBT",
      totalUnsecuredDebt: totalDebt,
      inferredModules: ["accounts", "debt", "budget"],
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
    <div className={cardStyle} data-testid="debt-snowball-tool">
      <div className={headerRowStyle}>
        <div>
          <h2 className={titleStyle}>Debt payoff: snowball vs avalanche calculator</h2>
          <p className={introStyle}>
            Compare total interest and debt-free dates when paying the highest rate first
            (avalanche) or the smallest balance first (snowball).
          </p>
        </div>
      </div>

      <div className={gridStyle}>
        <div>
          <fieldset className={liabilityCardStyle}>
            <legend className={liabilityTitleStyle}>Liability 1: Credit card</legend>
            <div className={liabilityFieldsStyle}>
              <div className={inputGroupStyle}>
                <label className={fieldLabelStyle} htmlFor="debt-card-balance">
                  Balance (£)
                </label>
                <input
                  id="debt-card-balance"
                  className={textInputStyle}
                  type="number"
                  value={cardBalance}
                  onChange={(e) => setCardBalance(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
              <div className={inputGroupStyle}>
                <label className={fieldLabelStyle} htmlFor="debt-card-apr">
                  APR (%)
                </label>
                <input
                  id="debt-card-apr"
                  className={textInputStyle}
                  step="0.1"
                  type="number"
                  value={cardApr}
                  onChange={(e) => setCardApr(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
              <div className={inputGroupStyle}>
                <label className={fieldLabelStyle} htmlFor="debt-card-min">
                  Min / mo (£)
                </label>
                <input
                  id="debt-card-min"
                  className={textInputStyle}
                  type="number"
                  value={cardMin}
                  onChange={(e) => setCardMin(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className={liabilityCardStyle}>
            <legend className={liabilityTitleStyle}>Liability 2: Personal loan</legend>
            <div className={liabilityFieldsStyle}>
              <div className={inputGroupStyle}>
                <label className={fieldLabelStyle} htmlFor="debt-loan-balance">
                  Balance (£)
                </label>
                <input
                  id="debt-loan-balance"
                  className={textInputStyle}
                  type="number"
                  value={loanBalance}
                  onChange={(e) => setLoanBalance(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
              <div className={inputGroupStyle}>
                <label className={fieldLabelStyle} htmlFor="debt-loan-apr">
                  APR (%)
                </label>
                <input
                  id="debt-loan-apr"
                  className={textInputStyle}
                  step="0.1"
                  type="number"
                  value={loanApr}
                  onChange={(e) => setLoanApr(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
              <div className={inputGroupStyle}>
                <label className={fieldLabelStyle} htmlFor="debt-loan-min">
                  Min / mo (£)
                </label>
                <input
                  id="debt-loan-min"
                  className={textInputStyle}
                  type="number"
                  value={loanMin}
                  onChange={(e) => setLoanMin(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
            </div>
          </fieldset>

          <div className={inputGroupStyle}>
            <div className={surplusRowStyle}>
              <label htmlFor="extra-payment-input" className={surplusLabelStyle}>
                Extra each month, on top of the minimums
              </label>
              <div className={pillWrapStyle}>
                <span className={pillPrefixStyle}>+£</span>
                <input
                  id="extra-payment-input"
                  className={pillInputStyle}
                  type="number"
                  min={0}
                  step={10}
                  value={extraPayment}
                  onChange={(e) => setExtraPayment(Math.max(0, Number(e.target.value) || 0))}
                />
                <span className={pillSuffixStyle}>/mo</span>
              </div>
            </div>
            <input
              id="extra-payment-slider"
              aria-label="Extra each month slider"
              className={rangeStyle}
              max={500}
              min={0}
              step={10}
              type="range"
              value={extraPayment}
              onChange={(e) => setExtraPayment(Number(e.target.value))}
            />
          </div>
        </div>

        <div className={resultsBoxStyle}>
          <LiveRegion debounceMs={1000} message={headline} visuallyHidden />
          <div>
            <span className={tagStyle({ tone: "warning" })}>
              Avalanche strategy (highest APR first)
            </span>
            {comparison.avalanche.payoffAchievable ? (
              <>
                <div className={heroFigureStyle}>
                  Debt free: {comparison.avalanche.debtFreeDate}
                </div>
                <p className={captionStyle}>
                  {comparison.avalanche.months} months, total interest £
                  {Math.round(comparison.avalanche.totalInterest).toLocaleString("en-GB")}.{" "}
                  {comparison.monthsShavedAvalancheVsMin} months sooner than paying only the
                  minimums
                </p>
              </>
            ) : (
              <div className={heroFigureStyle}>These payments would not clear the debts</div>
            )}
          </div>
          <div className={savedBoxStyle}>
            <span className={savedLabelStyle}>
              Interest saved compared with paying only the minimums
            </span>
            <div className={savedFigureStyle}>
              £{Math.round(comparison.interestSavedAvalancheVsMin).toLocaleString("en-GB")}
            </div>
          </div>

          <div>
            <span className={tagStyle({ tone: "info" })}>
              Snowball strategy (smallest balance first)
            </span>
            <div className={snowballWinStyle}>
              {comparison.snowball.quickWinDebtName
                ? `Snowball clears the ${comparison.snowball.quickWinDebtName} first`
                : comparison.snowballFirstWinDescription}
            </div>
            <p className={captionStyle}>
              {comparison.snowball.payoffAchievable
                ? `${comparison.snowball.months} months, total interest £${Math.round(
                    comparison.snowball.totalInterest,
                  ).toLocaleString("en-GB")}`
                : "These payments would not clear the debts"}
            </p>
          </div>

          <Button className={ctaStyle} onClick={handleSave} size="md">
            {ctaText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DebtSnowballCalculator;
