import { Button, Icon, Money, Num, StatusBadge } from "@repo/ui";
import { Check, Lock } from "lucide-react";
import type { FC } from "react";
import {
  ltvCard,
  ltvEyebrow,
  ltvHeader,
  ltvHeading,
  tierBody,
  tierCard,
  tierGrid,
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
  onApplyOverpayment: (monthlyAmount: number) => void;
}

export const LtvMilestones: FC<LtvMilestonesProps> = ({
  currentLtv,
  loanAmount,
  propertyValue,
  ownershipSharePct,
  milestones,
  onApplyOverpayment,
}) => (
  <div
    className={ltvCard()}
    data-density="compact"
    data-testid="ltv-milestones"
    id="ltv-milestones"
  >
    <div className={ltvHeader()}>
      <div>
        <p className={ltvEyebrow()}>LTV threshold milestones and interest tiers</p>
        <h3 className={ltvHeading()} id="ltv-milestones-heading">
          Current LTV: {currentLtv.toFixed(1)}% (<Money size="sm" value={loanAmount} /> /{" "}
          <Money size="sm" value={propertyValue} />)
        </h3>
      </div>
      <StatusBadge variant="brand">
        Ownership share: <Num size="sm" value={ownershipSharePct} kind="percent" />
      </StatusBadge>
    </div>

    <div className={tierGrid()}>
      {milestones.map((m) => {
        const monthly = m.requiredMonthlyOverpaymentBeforeFixGbp;
        return (
          <div className={tierCard({ achieved: m.isAchieved })} key={m.targetLtvPct}>
            <div className={tierTop()}>
              <span className={tierTitle()}>{m.targetLtvPct}% LTV tier</span>
              <StatusBadge
                icon={<Icon icon={m.isAchieved ? Check : Lock} size="sm" />}
                size="sm"
                variant={m.isAchieved ? "positive" : "warning"}
              >
                {m.isAchieved ? "Unlocked" : "Locked"}
              </StatusBadge>
            </div>
            <div className={tierBody()}>
              {m.isAchieved ? (
                "Lowest rate tier active"
              ) : (
                <>
                  <div>
                    <Money size="sm" value={m.lumpSumNeededGbp} /> equity needed
                  </div>
                  {monthly ? (
                    <div>
                      <Money size="sm" value={monthly} />
                      /mo to unlock
                      <div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onApplyOverpayment(monthly)}
                        >
                          Apply <Money size="sm" value={monthly} />
                          /mo
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
