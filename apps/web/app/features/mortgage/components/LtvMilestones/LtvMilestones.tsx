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

const ltvFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });

const formatBandList = (pcts: number[]): string => {
  const items = pcts.map((p) => `${p}%`);
  return items.length <= 1
    ? items.join("")
    : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
};

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
}) => {
  // Bands the LTV is already within all read the same, so they share one row.
  const achieved = milestones.filter((m) => m.isAchieved).map((m) => m.targetLtvPct);
  const above = milestones.filter((m) => !m.isAchieved);
  return (
    <div className={ltvBody()} data-testid="ltv-milestones" id="ltv-milestones">
      <div className={ltvHeader()}>
        <div>
          <p className={ltvEyebrow()}>Loan to value (LTV) bands</p>
          <h3 className={ltvHeading()} id="ltv-milestones-heading">
            Current LTV: {ltvFormat.format(currentLtv)}% (<Money size="sm" value={loanAmount} /> /{" "}
            <Money size="sm" value={propertyValue} />)
          </h3>
        </div>
        {/* Owning all of it is the usual case, so the share shows only when it is less. */}
        {ownershipSharePct < 100 ? (
          <p className={ltvShare()}>
            Share you own: <Num size="sm" value={ownershipSharePct} kind="percent" />
          </p>
        ) : null}
      </div>

      <ul className={tierGrid()}>
        {achieved.length > 0 ? (
          <li className={tierCard()} data-list-row="" key="achieved">
            <div className={tierTop()}>
              <span className={tierTitle()}>
                {formatBandList(achieved)} LTV {achieved.length === 1 ? "band" : "bands"}
              </span>
              <span className={tierState()}>
                {achieved.length === 1 ? "At or below this band" : "At or below these bands"}
              </span>
            </div>
            <div className={tierBody()}>
              {achieved.length === 1
                ? "Your LTV is within this band"
                : "Your LTV is within these bands"}
            </div>
          </li>
        ) : null}
        {above.map((m) => {
          const monthly = m.requiredMonthlyOverpaymentBeforeFixGbp;
          return (
            <li className={tierCard()} data-list-row="" key={m.targetLtvPct}>
              <div className={tierTop()}>
                <span className={tierTitle()}>{m.targetLtvPct}% LTV band</span>
                <span className={tierState()}>Above this band</span>
              </div>
              <div className={tierBody()}>
                <div>
                  <Money size="sm" value={m.lumpSumNeededGbp} /> less to owe to reach this band
                </div>
                {monthly ? (
                  <div>
                    <Money size="sm" value={monthly} /> a month until your fixed rate ends
                    (estimate)
                    <div>
                      <Button size="sm" variant="ghost" onClick={() => onModelOverpayment(monthly)}>
                        Model <Money size="sm" value={monthly} /> a month
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
