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
}

export const OverdraftCostCalculator: FC<OverdraftCostCalculatorProps> = ({
  onSaveAndContinue,
  ctaText = "Eliminate your overdraft with Flump →",
}) => {
  const [balance, setBalance] = useState<number>(1200);
  const [earRate, setEarRate] = useState<number>(39.9);

  const cost = useMemo(() => {
    return calculateOverdraftCost(balance, earRate);
  }, [balance, earRate]);

  const headline = `Overdraft costs £${Math.round(cost.annualPoundCost).toLocaleString(
    "en-GB",
  )} a year in interest`;

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
    <div className={cardStyle} data-testid="overdraft-cost-tool">
      <div className={headerStyle}>
        <div>
          <h2 className={titleStyle}>Overdraft interest cost calculator</h2>
          <p className={introStyle}>
            UK banks charge effective rates approaching 40% EAR on arranged overdrafts. Calculate
            your stealth annual fee.
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
              onChange={(e) => setBalance(Number(e.target.value) || 0)}
            />
          </div>

          <div className={inputGroupStyle}>
            <label className={fieldLabelStyle} htmlFor="overdraft-ear-rate">
              Bank EAR rate (%) (UK standard is ~39.9%)
            </label>
            <input
              id="overdraft-ear-rate"
              className={textInputStyle}
              step="0.1"
              type="number"
              value={earRate}
              onChange={(e) => setEarRate(Number(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className={resultsBoxStyle}>
          <LiveRegion debounceMs={1000} message={headline} visuallyHidden />
          <div>
            <span className={badgeRecipe({ tone: "danger" })}>Annual bank interest cost</span>
            <div className={figureRecipe({ tone: "danger" })}>
              £{Math.round(cost.annualPoundCost).toLocaleString("en-GB")} / year
            </div>
            <p className={noteStyle}>
              Directly debited as ~£{penceFormatter.format(cost.monthlyPoundCost)}/month from your
              regular checking balance.
            </p>
          </div>

          <div className={calloutRecipe({ tone: "neutral" })}>
            <div className={calloutTitleRecipe({ tone: "neutral" })}>
              Why overdrafts are dangerous
            </div>
            <p className={calloutBodyRecipe({ tone: "neutral" })}>
              Because there is no fixed repayment date or separate statement, persistent overdrafts
              act as an indefinite 40% APR revolving charge. Clearing a £1,200 overdraft delivers an
              immediate guaranteed 39.9% tax-free return on your money.
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
