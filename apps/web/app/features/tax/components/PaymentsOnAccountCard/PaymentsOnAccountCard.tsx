import { Card, Icon, Money, StatusBadge } from "@repo/ui";
import { Calendar, Info } from "lucide-react";
import { type FC, useMemo } from "react";
import {
  body,
  caption,
  deadline,
  deadlineHead,
  deadlineName,
  deadlines,
  header,
  iconTile,
  intro,
  note,
  perMonth,
  reserveTile,
  titleRow,
  title as titleStyle,
} from "./PaymentsOnAccountCard.styles";

export interface PaymentsOnAccountCardProps {
  annualSelfAssessmentTax: number;
}

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});
const formatGBP = (num: number) => gbp.format(Math.max(0, Math.round(num)));

export const PaymentsOnAccountCard: FC<PaymentsOnAccountCardProps> = ({
  annualSelfAssessmentTax,
}) => {
  const tax = Math.max(0, annualSelfAssessmentTax);
  const requiresPaymentsOnAccount = tax > 1000;

  // Payments on account are each 50% of the prior year bill
  const paymentOnAccount50Pct = Math.round(tax * 0.5);

  // Monthly set-aside: spread over 12 months
  const monthlyPotTransfer = Math.round(tax / 12);

  // Days to the next 31 Jan
  const daysToJan31 = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    let target = new Date(currentYear, 0, 31, 23, 59, 59);
    if (now > target) {
      target = new Date(currentYear + 1, 0, 31, 23, 59, 59);
    }
    const diffMs = target.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }, []);

  if (tax <= 0) {
    return null;
  }

  return (
    <Card as="section" padding="lg" data-testid="payments-on-account-card">
      <div className={body()}>
        <div className={header()}>
          <div>
            <div className={titleRow()}>
              <span className={iconTile()}>
                <Icon icon={Calendar} size="sm" />
              </span>
              <h3 className={titleStyle()}>HMRC payments on account and cash-flow reserve</h3>
            </div>
            <p className={intro()}>
              HMRC requires self-assessment taxpayers with bills over £1,000 to make advance
              payments on 31 January and 31 July.
            </p>
          </div>

          <div className={reserveTile()}>
            <span className={caption()}>Monthly tax pot set-aside</span>
            <span>
              <Money size="lg" tone="positive" value={monthlyPotTransfer} />
              <span className={perMonth()}>/ mo</span>
            </span>
          </div>
        </div>

        <div className={deadlines()}>
          <div className={deadline()}>
            <div className={deadlineHead()}>
              <h4 className={deadlineName()}>31 January deadline</h4>
              <StatusBadge variant="warning">{daysToJan31} days left</StatusBadge>
            </div>
            <Money
              size="md"
              value={requiresPaymentsOnAccount ? tax + paymentOnAccount50Pct : tax}
            />
            <span className={caption()}>
              {requiresPaymentsOnAccount
                ? `Balancing bill (${formatGBP(tax)}) + 1st payment on account (${formatGBP(paymentOnAccount50Pct)})`
                : "Single annual balancing payment"}
            </span>
          </div>

          <div className={deadline()}>
            <div className={deadlineHead()}>
              <h4 className={deadlineName()}>31 July deadline</h4>
              <StatusBadge variant="brand">2nd payment on account</StatusBadge>
            </div>
            <Money size="md" value={requiresPaymentsOnAccount ? paymentOnAccount50Pct : 0} />
            <span className={caption()}>
              {requiresPaymentsOnAccount
                ? "50% advance payment towards the upcoming tax year"
                : "No July payment required (bill under £1,000)"}
            </span>
          </div>
        </div>

        <p className={note()}>
          <Icon icon={Info} size="sm" />
          <span>
            A monthly set-aside of {formatGBP(monthlyPotTransfer)} would cover this by the deadline.
          </span>
        </p>
      </div>
    </Card>
  );
};

export default PaymentsOnAccountCard;
