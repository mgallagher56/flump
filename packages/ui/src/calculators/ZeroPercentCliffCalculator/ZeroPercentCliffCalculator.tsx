import { calculateZeroPercentCliff, persistOnboardingSeed } from "@flump/finance-engine";
import type { FC } from "react";
import { useMemo, useState } from "react";
import { FaExclamationTriangle } from "react-icons/fa";
import { Button } from "../../primitives/Button";
import { LiveRegion } from "../../primitives/LiveRegion";
import {
  alertHeadingStyle,
  badgeRecipe,
  calloutBodyRecipe,
  calloutRecipe,
  calloutTitleRecipe,
  cardStyle,
  ctaStyle,
  fieldLabelStyle,
  figureRecipe,
  gridStyle,
  headerStyle,
  inputGroupStyle,
  introStyle,
  noteStyle,
  resultsBoxStyle,
  textInputStyle,
  titleStyle,
} from "./ZeroPercentCliffCalculator.styles.js";

export interface ZeroPercentCliffCalculatorProps {
  onSaveAndContinue?: (payload: any) => void;
  ctaText?: string;
}

export const ZeroPercentCliffCalculator: FC<ZeroPercentCliffCalculatorProps> = ({
  onSaveAndContinue,
  ctaText = "Track 0% expiry dates in Flump free →",
}) => {
  const [balance, setBalance] = useState<number>(3600);
  const [months, setMonths] = useState<number>(18);
  const [revertApr, setRevertApr] = useState<number>(24.9);

  const cliff = useMemo(() => {
    return calculateZeroPercentCliff(balance, months, revertApr);
  }, [balance, months, revertApr]);

  const headline = `Pay £${Math.round(cliff.requiredMonthlyPayment).toLocaleString(
    "en-GB",
  )} a month to clear the balance before the 0% offer ends`;

  const handleSave = () => {
    const payload = {
      mode: "DEBT",
      totalUnsecuredDebt: balance,
      inferredModules: ["accounts", "debt", "budget"],
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
    <div className={cardStyle} data-testid="zero-percent-cliff-tool">
      <div className={headerStyle}>
        <div>
          <h2 className={titleStyle}>0% balance transfer promotional expiry calculator</h2>
          <p className={introStyle}>
            Calculate the exact monthly repayment needed to clear your card before the 0%
            promotional window expires.
          </p>
        </div>
      </div>

      <div className={gridStyle}>
        <div>
          <div className={inputGroupStyle}>
            <span className={fieldLabelStyle}>Current 0% card balance (£)</span>
            <input
              aria-label="0% card balance"
              className={textInputStyle}
              min={100}
              type="number"
              value={balance}
              onChange={(e) => setBalance(Number(e.target.value) || 0)}
            />
          </div>

          <div className={inputGroupStyle}>
            <span className={fieldLabelStyle}>Months remaining on 0% offer</span>
            <input
              aria-label="Months remaining on 0% offer"
              className={textInputStyle}
              max={48}
              min={1}
              type="number"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value) || 1)}
            />
          </div>

          <div className={inputGroupStyle}>
            <span className={fieldLabelStyle}>Revert APR after offer ends (%)</span>
            <input
              aria-label="Revert APR"
              className={textInputStyle}
              step="0.1"
              type="number"
              value={revertApr}
              onChange={(e) => setRevertApr(Number(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className={resultsBoxStyle}>
          <LiveRegion debounceMs={1000} message={headline} visuallyHidden />
          <div>
            <span className={badgeRecipe({ tone: "positive" })}>Target monthly payment</span>
            <div className={figureRecipe({ tone: "positive" })}>
              £{Math.round(cliff.requiredMonthlyPayment).toLocaleString("en-GB")} / month
            </div>
            <p className={noteStyle}>
              Clears the entire £{balance.toLocaleString("en-GB")} balance across {months} months
              without paying £1 in interest.
            </p>
          </div>

          <div className={calloutRecipe({ tone: "danger" })}>
            <div className={alertHeadingStyle}>
              <FaExclamationTriangle aria-hidden="true" size={16} />
              <strong className={calloutTitleRecipe({ tone: "danger" })}>Revert APR alert</strong>
            </div>
            <p className={calloutBodyRecipe({ tone: "danger" })}>
              If you pay only minimums, you will reach the {revertApr}% revert date with ~£
              {Math.round(cliff.balanceRemainingIfMinimum).toLocaleString("en-GB")} unpaid, costing
              £{Math.round(cliff.penaltyInterestFirstYearIfUnpaid).toLocaleString("en-GB")} in
              first-year interest.
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

export default ZeroPercentCliffCalculator;
