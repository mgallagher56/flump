import { Button, Money, Num } from "@repo/ui";
import type { FC } from "react";
import {
  ltvBody,
  ltvEyebrow,
  ltvHeader,
  ltvHeading,
  ltvShare,
  tierBody,
  tierCard,
  tierGrid,
  tierState,
  tierTitle,
  tierTop,
} from "./LtvMilestones.styles";

export interface LtvMilestone {
  targetLtvPct: number;
  isAchieved: boolean;
  lumpSumNeededGbp: number;
  requiredMonthlyOverpaymentBeforeFixGbp?: number | null;
}

export interface LtvMilestonesProps {
  currentLtv: number;
  loanAmount: number;
  propertyValue: number;
  ownershipSharePct: number;
  milestones: LtvMilestone[];
  onModelOverpayment: (monthlyAmount: number) => void;
}

/**
 * Loan to value bands (E16 PR 6), shown in the "Show loan to value bands" drawer. Facts only: each
 * band says whether the LTV is within it and, if not, the amount less to owe. No status colours,
 * locks or claims about lender pricing.
 */
export const LtvMilestones: FC<LtvMilestonesProps> = ({
  currentLtv,
  loanAmount,
  propertyValue,
  ownershipSharePct,
  milestones,
  onModelOverpayment,
}) => (
  <div className={ltvBody()} data-testid="ltv-milestones" id="ltv-milestones">
    <div className={ltvHeader()}>
      <div>
        <p className={ltvEyebrow()}>Loan to value (LTV) bands</p>
        <h3 className={ltvHeading()} id="ltv-milestones-heading">
          Current LTV: {currentLtv.toFixed(1)}% (<Money size="sm" value={loanAmount} /> /{" "}
          <Money size="sm" value={propertyValue} />)
        </h3>
      </div>
      <p className={ltvShare()}>
        Share you own: <Num size="sm" value={ownershipSharePct} kind="percent" />
      </p>
    </div>

    <ul className={tierGrid()}>
      {milestones.map((m) => {
        const monthly = m.requiredMonthlyOverpaymentBeforeFixGbp;
        return (
          <li className={tierCard()} data-list-row="" key={m.targetLtvPct}>
            <div className={tierTop()}>
              <span className={tierTitle()}>{m.targetLtvPct}% LTV band</span>
              <span className={tierState()}>
                {m.isAchieved ? "At or below this band" : "Above this band"}
              </span>
            </div>
            <div className={tierBody()}>
              {m.isAchieved ? (
                "Your LTV is within this band"
              ) : (
                <>
                  <div>
                    <Money size="sm" value={m.lumpSumNeededGbp} /> less to owe to reach this band
                  </div>
                  {monthly ? (
                    <div>
                      <Money size="sm" value={monthly} /> a month until your fixed rate ends
                      (estimate)
                      <div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onModelOverpayment(monthly)}
                        >
                          Model <Money size="sm" value={monthly} /> a month
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  </div>
);
