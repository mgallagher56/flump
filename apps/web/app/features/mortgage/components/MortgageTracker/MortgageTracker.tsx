import { calculateMortgageCostSummary } from "@flump/finance-engine";
import { ProgressBar } from "@repo/ui";
import type { FC } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import {
  breakdown,
  costLabel,
  costList,
  costRow,
  costValue,
  interestShareText,
  legendDot,
  legendItem,
  legendRow,
  resultsBody,
  summaryText,
} from "./MortgageTracker.styles";

/**
 * Cost details for the saved figures (E16 PR 6), shown inside the "Show cost details" drawer. The
 * monthly payment is the page's hero, so it is not repeated here. Saved figures only: nothing is
 * editable, so nothing can drift from what is stored.
 */
export interface MortgageTrackerProps {
  loanAmount: number;
  interestRate: number;
  remainingTerm: number;
  mortgageType?: "repayment" | "interest-only";
}

const percentFormat = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export const MortgageTracker: FC<MortgageTrackerProps> = ({
  loanAmount,
  interestRate,
  remainingTerm,
  mortgageType = "repayment",
}) => {
  const { formatCurrency } = useFormatCurrency();
  const isInterestOnly = mortgageType === "interest-only";

  const costSummary = calculateMortgageCostSummary(
    loanAmount,
    interestRate,
    remainingTerm,
    mortgageType,
  );

  // The page only opens this drawer when every figure is known; say so plainly otherwise.
  if (costSummary === null) {
    return (
      <p className={summaryText} id="tracker-empty">
        Add your balance, interest rate and years left to see what your mortgage costs.
      </p>
    );
  }

  const { totalInterest, totalPaid, interestPercentage } = costSummary;

  return (
    <div className={resultsBody()} data-testid="mortgage-cost-details">
      <dl className={costList()}>
        <div className={costRow()}>
          <dt className={costLabel()}>Total interest (estimate)</dt>
          <dd className={costValue()}>{formatCurrency(totalInterest)}</dd>
        </div>
        <div className={costRow()}>
          <dt className={costLabel()}>Total to pay (estimate)</dt>
          <dd className={costValue()}>{formatCurrency(totalPaid)}</dd>
        </div>
        {isInterestOnly ? (
          <div className={costRow()}>
            <dt className={costLabel()}>Loan to repay at the end of the term</dt>
            <dd className={costValue()}>{formatCurrency(loanAmount)}</dd>
          </div>
        ) : null}
      </dl>

      <div className={breakdown()}>
        <ProgressBar
          height={12}
          label="Cost split"
          value={interestPercentage}
          valueDisplay={
            <span className={interestShareText}>
              {`${percentFormat.format(interestPercentage)}% of the total is interest`}
            </span>
          }
          variant="neutral"
        />
        <div className={legendRow()}>
          <span className={legendItem()}>
            <span aria-hidden="true" className={legendDot({ kind: "principal" })} />
            <span>
              {isInterestOnly ? "Loan to repay at the end" : "Loan repaid"}:{" "}
              {formatCurrency(loanAmount)}
            </span>
          </span>
          <span className={legendItem()}>
            <span aria-hidden="true" className={legendDot({ kind: "interest" })} />
            <span>Interest: {formatCurrency(totalInterest)}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
