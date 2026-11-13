import { calculateMonthlyMortgagePayment } from "@flump/finance-engine";
import { KpiCard, Money, Num } from "@repo/ui";
import { Home } from "lucide-react";
import type { FC } from "react";
import { SampleAwareLink } from "~/components/navigation/SampleAwareLink";
import { WidgetCard } from "../WidgetCard";
import {
  actionLink,
  detailLabel,
  detailList,
  detailRow,
  detailValue,
  widgetContent,
} from "./MortgageWidget.styles";

export interface MortgageWidgetProps {
  data: {
    mortgageBalance: number;
    /** Annual rate as a percentage, or `null` when not stored. Never assumed. */
    interestRate: number | null;
    /** Remaining term in years, or `null` when not stored. Never assumed. */
    remainingTermYears: number | null;
    hasMortgageAccount: boolean;
  };
  onHide?: () => void;
}

/**
 * Dashboard mortgage summary. The monthly payment comes from the finance engine and only appears
 * when both the rate and the term are known; otherwise it reads "Not set" with a way to add them.
 */
export const MortgageWidget: FC<MortgageWidgetProps> = ({ data, onHide }) => {
  const balance = Math.abs(data.mortgageBalance);
  const { interestRate, remainingTermYears } = data;
  const monthlyPayment =
    interestRate != null && remainingTermYears != null && balance > 0
      ? calculateMonthlyMortgagePayment(balance, interestRate, remainingTermYears * 12)
      : null;

  return (
    <WidgetCard href="/app/mortgage" icon={Home} id="mortgage" title="Mortgage" onHide={onHide}>
      <div className={widgetContent()}>
        <KpiCard
          label="Remaining mortgage"
          value={balance > 0 ? <Money size="lg" value={balance} /> : "No mortgage balance"}
        />
        <dl className={detailList()}>
          {interestRate != null && (
            <div className={detailRow()}>
              <dt className={detailLabel()}>Interest rate</dt>
              <dd className={detailValue()}>
                <Num fractionDigits={2} kind="percent" value={interestRate} />
              </dd>
            </div>
          )}
          {remainingTermYears != null && (
            <div className={detailRow()}>
              <dt className={detailLabel()}>Remaining term</dt>
              <dd className={detailValue()}>
                <Num value={remainingTermYears} />
                <span>{remainingTermYears === 1 ? "year" : "years"}</span>
              </dd>
            </div>
          )}
          {balance > 0 && (
            <div className={detailRow()}>
              <dt className={detailLabel()}>Estimated monthly payment</dt>
              <dd className={detailValue()}>
                <Money
                  fractionDigits={2}
                  notSetAction={
                    <SampleAwareLink className={actionLink()} to="/app/mortgage">
                      Add rate and term
                    </SampleAwareLink>
                  }
                  value={monthlyPayment}
                />
                {monthlyPayment !== null && <span>a month</span>}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </WidgetCard>
  );
};
