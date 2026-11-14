import { Card, Money } from "@repo/ui";
import type { FC } from "react";
import {
  body,
  caption,
  deadline,
  deadlineName,
  deadlines,
  intro,
  title,
} from "./PaymentsOnAccountCard.styles";

export interface PaymentsOnAccountCardProps {
  /** Estimated bill for the year, in pounds. */
  annualSelfAssessmentTax: number;
  /** The tax year the bill is for, e.g. "2026/27". */
  taxYear: string;
}

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * When the estimated bill is paid. The bill for a tax year is due on 31 January after it ends;
 * over £1,000, HMRC also asks for two payments towards the next year, each half of this bill,
 * on that 31 January and the 31 July after. Neutral styling throughout: a deadline is a fact.
 */
export const PaymentsOnAccountCard: FC<PaymentsOnAccountCardProps> = ({
  annualSelfAssessmentTax,
  taxYear,
}) => {
  const tax = Math.max(0, Math.round(annualSelfAssessmentTax));
  if (tax <= 0) return null;

  const start = Number.parseInt(taxYear.split("/")[0] ?? "", 10);
  const january = dateFormat.format(new Date(Date.UTC(start + 2, 0, 31)));
  const july = dateFormat.format(new Date(Date.UTC(start + 2, 6, 31)));
  const withPaymentsOnAccount = tax > 1000;
  const half = Math.round(tax / 2);

  return (
    <Card as="section" data-testid="payments-on-account-card" padding="lg">
      <div className={body()}>
        <h3 className={title()}>Payment dates</h3>
        {withPaymentsOnAccount ? (
          <p className={intro()}>
            This estimate assumes HMRC asks for two payments on account, on 31 January and 31 July,
            because the estimated bill is over £1,000.
          </p>
        ) : null}
        <div className={deadlines()}>
          <div className={deadline()}>
            <h4 className={deadlineName()}>Due {january}</h4>
            <Money fractionDigits={0} size="md" value={withPaymentsOnAccount ? tax + half : tax} />
            <span className={caption()}>
              {withPaymentsOnAccount
                ? "This year's bill plus the first payment towards next year"
                : "One payment for this year's bill"}
            </span>
          </div>
          <div className={deadline()}>
            <h4 className={deadlineName()}>Due {july}</h4>
            {withPaymentsOnAccount ? (
              <>
                <Money fractionDigits={0} size="md" value={half} />
                <span className={caption()}>Second payment on account</span>
              </>
            ) : (
              <span className={caption()}>
                No July payment, because the estimated bill is under £1,000
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PaymentsOnAccountCard;
