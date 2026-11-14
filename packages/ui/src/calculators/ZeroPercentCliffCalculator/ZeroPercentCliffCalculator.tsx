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

const currency = (digits: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
const wholeFormatter = currency(0);
const penceFormatter = currency(2);
/** £3,600 for whole pounds, £3,600.50 when there are pence. */
const formatBalance = (n: number) =>
  (Number.isInteger(n) ? wholeFormatter : penceFormatter).format(n);
const wholePounds = (n: number) => `£${Math.round(n).toLocaleString("en-GB")}`;

export interface ZeroPercentCliffCalculatorProps {
  onSaveAndContinue?: (payload: any) => void;
  ctaText?: string;
  /** When false, entered figures are not written to the onboarding seed in local storage. Default true. */
  persistSeed?: boolean;
}

export const ZeroPercentCliffCalculator: FC<ZeroPercentCliffCalculatorProps> = ({
  onSaveAndContinue,
  ctaText = "Track 0% expiry dates in Flump free →",
  persistSeed = true,
}) => {
  const [balance, setBalance] = useState<number>(3600);
  const [months, setMonths] = useState<number>(18);
  const [revertApr, setRevertApr] = useState<number>(24.9);

  const cliff = useMemo(() => {
    return calculateZeroPercentCliff(balance, months, revertApr);
  }, [balance, months, revertApr]);

  const headline = `About ${wholePounds(cliff.requiredMonthlyPayment)} a month would clear the balance before the 0% offer ends`;
  const minimumClears = cliff.balanceRemainingIfMinimum <= 0;

  const handleSave = () => {
    const payload = {
      mode: "DEBT",
      totalUnsecuredDebt: balance,
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
    <div className={cardStyle} data-testid="zero-percent-cliff-tool">
      <div className={headerStyle}>
        <div>
          <h2 className={titleStyle}>0% balance transfer promotional expiry calculator</h2>
          <p className={introStyle}>
            Estimate the monthly payment that would clear your card before the 0% promotional rate
            ends.
          </p>
        </div>
      </div>

      <div className={gridStyle}>
        <div>
          <div className={inputGroupStyle}>
            <label className={fieldLabelStyle} htmlFor="zero-percent-balance">
              Current 0% card balance (£)
            </label>
            <input
              id="zero-percent-balance"
              className={textInputStyle}
              min={100}
              type="number"
              value={balance}
              onChange={(e) => setBalance(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>

          <div className={inputGroupStyle}>
            <label className={fieldLabelStyle} htmlFor="zero-percent-months">
              Months remaining on 0% offer
            </label>
            <input
              id="zero-percent-months"
              className={textInputStyle}
              max={48}
              min={1}
              type="number"
              value={months}
              onChange={(e) =>
                setMonths(Math.min(48, Math.max(1, Math.round(Number(e.target.value)) || 1)))
              }
            />
          </div>

          <div className={inputGroupStyle}>
            <label className={fieldLabelStyle} htmlFor="zero-percent-revert-apr">
              Revert APR after offer ends (%)
            </label>
            <input
              id="zero-percent-revert-apr"
              className={textInputStyle}
              step="0.1"
              type="number"
              value={revertApr}
              onChange={(e) => setRevertApr(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
        </div>

        <div className={resultsBoxStyle}>
          <LiveRegion debounceMs={1000} message={headline} visuallyHidden />
          <div>
            <span className={badgeRecipe({ tone: "positive" })}>Target monthly payment</span>
            <div className={figureRecipe({ tone: "positive" })}>
              {wholePounds(cliff.requiredMonthlyPayment)} / month
            </div>
            <p className={noteStyle}>
              Paying this each month would clear the {formatBalance(balance)} balance in {months}{" "}
              {months === 1 ? "month" : "months"} with no interest, as long as the 0% rate applies
              and no fees are added.
            </p>
          </div>

          <div className={calloutRecipe({ tone: "danger" })}>
            <div className={alertHeadingStyle}>
              <FaExclamationTriangle aria-hidden="true" size={16} />
              <strong className={calloutTitleRecipe({ tone: "danger" })}>
                If you pay only the minimum
              </strong>
            </div>
            <p className={calloutBodyRecipe({ tone: "danger" })}>
              {minimumClears
                ? "A minimum of 2% of today's balance (at least £25) a month would clear it before the 0% rate ends."
                : `A minimum of 2% of today's balance (at least £25) a month would leave about ${wholePounds(
                    cliff.balanceRemainingIfMinimum,
                  )} when the 0% rate ends. At ${revertApr.toLocaleString("en-GB")}% that is about ${wholePounds(
                    cliff.penaltyInterestFirstYearIfUnpaid,
                  )} of interest over the next year if nothing more were paid.`}
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
