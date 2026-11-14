import { calculateOverdraftCost, persistOnboardingSeed } from "@flump/finance-engine";
import type { FC } from "react";
import { useMemo, useState } from "react";
import { Button } from "../../primitives/Button";
import { LiveRegion } from "../../primitives/LiveRegion";
import {
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
} from "./OverdraftCostCalculator.styles.js";

const penceFormatter = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export interface OverdraftCostCalculatorProps {
  onSaveAndContinue?: (payload: any) => void;
  ctaText?: string;
  /** When false, entered figures are not written to the onboarding seed in local storage. Default true. */
  persistSeed?: boolean;
}

export const OverdraftCostCalculator: FC<OverdraftCostCalculatorProps> = ({
  onSaveAndContinue,
  ctaText = "Add your overdraft to Flump →",
  persistSeed = true,
}) => {
  const [balance, setBalance] = useState<number>(1200);
  const [earRate, setEarRate] = useState<number>(39.9);

  const cost = useMemo(() => calculateOverdraftCost(balance, earRate), [balance, earRate]);
  // Interest on each £100 of the balance, for the "how it is worked out" note.
  const perHundred = useMemo(() => calculateOverdraftCost(100, earRate), [earRate]);

  const headline = `An estimated £${Math.round(cost.annualPoundCost).toLocaleString(
    "en-GB",
  )} a year in interest`;

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
    <div className={cardStyle} data-testid="overdraft-cost-tool">
      <div className={headerStyle}>
        <div>
          <h2 className={titleStyle}>Arranged overdraft cost calculator</h2>
          <p className={introStyle}>
            Estimate the interest an arranged overdraft costs over a year at the rate your bank
            charges. Your bank shows the rate as an EAR on your statement and its website.
          </p>
        </div>
      </div>

      <div className={gridStyle}>
        <div>
          <div className={inputGroupStyle}>
            <label className={fieldLabelStyle} htmlFor="overdraft-balance">
              Average overdraft balance used (£)
            </label>
            <input
              id="overdraft-balance"
              className={textInputStyle}
              min={50}
              type="number"
              value={balance}
              onChange={(e) => setBalance(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>

          <div className={inputGroupStyle}>
            <label className={fieldLabelStyle} htmlFor="overdraft-ear-rate">
              Your bank's overdraft rate (EAR, %)
            </label>
            <input
              id="overdraft-ear-rate"
              className={textInputStyle}
              step="0.1"
              type="number"
              value={earRate}
              onChange={(e) => setEarRate(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
        </div>

        <div className={resultsBoxStyle}>
          <LiveRegion debounceMs={1000} message={headline} visuallyHidden />
          <div>
            <span className={badgeRecipe({ tone: "danger" })}>Estimated interest a year</span>
            <div className={figureRecipe({ tone: "danger" })}>
              £{Math.round(cost.annualPoundCost).toLocaleString("en-GB")} / year
            </div>
            <p className={noteStyle}>
              About £{penceFormatter.format(cost.monthlyPoundCost)} a month, taken from your current
              account.
            </p>
          </div>

          <div className={calloutRecipe({ tone: "neutral" })}>
            <div className={calloutTitleRecipe({ tone: "neutral" })}>How this is worked out</div>
            <p className={calloutBodyRecipe({ tone: "neutral" })}>
              The balance times the EAR, as if £{balance.toLocaleString("en-GB")} stayed overdrawn
              all year. At {earRate.toLocaleString("en-GB")}% EAR, each £100 paid off lowers the
              yearly interest by about £{penceFormatter.format(perHundred.annualPoundCost)}.
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

export default OverdraftCostCalculator;
