import { calculateSelfAssessmentPayments, isSupportedUkTaxYear } from "@flump/finance-engine";
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
  /** Tax for the year already taken at source, such as through PAYE. */
  taxDeductedAtSource?: number;
}

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const formatDue = (isoDate: string) => dateFormat.format(new Date(`${isoDate}T00:00:00Z`));

/**
 * When the estimated bill is paid. The dates, the £1,000 and 80% thresholds and the amounts come
 * from the engine's payment schedule (`calculateSelfAssessmentPayments`); this card only lays them
 * out. Neutral styling throughout: a deadline is a fact.
 */
export const PaymentsOnAccountCard: FC<PaymentsOnAccountCardProps> = ({
  annualSelfAssessmentTax,
  taxYear,
  taxDeductedAtSource,
}) => {
  const tax = Math.max(0, Math.round(annualSelfAssessmentTax));
  if (tax <= 0 || !isSupportedUkTaxYear(taxYear)) return null;

  const payments = calculateSelfAssessmentPayments({ taxYear, bill: tax, taxDeductedAtSource });
  const january = formatDue(payments.january.date);
  // The July date is shown either way, so the card says plainly when nothing is due then.
  const july = formatDue(payments.january.date.replace("-01-31", "-07-31"));
  const withPaymentsOnAccount = payments.paymentsOnAccountDue;

  return (
    <Card as="section" data-testid="payments-on-account-card" padding="lg">
      <div className={body()}>
        <h3 className={title()}>Payment dates</h3>
        {withPaymentsOnAccount ? (
          <p className={intro()}>
            This estimate assumes HMRC asks for two payments on account, on 31 January and 31 July,
            because the estimated bill is £1,000 or more.
          </p>
        ) : null}
        <div className={deadlines()}>
          <div className={deadline()}>
            <h4 className={deadlineName()}>Due {january}</h4>
            <Money fractionDigits={0} size="md" value={payments.january.amount} />
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
                <Money fractionDigits={0} size="md" value={payments.paymentOnAccount} />
                <span className={caption()}>Second payment on account</span>
              </>
            ) : (
              <span className={caption()}>
                {payments.reason === "mostly-taken-at-source"
                  ? "No July payment, because more than 80% of your tax for the year is taken at source"
                  : "No July payment, because the estimated bill is under £1,000"}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PaymentsOnAccountCard;
