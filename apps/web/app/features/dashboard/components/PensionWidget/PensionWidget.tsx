import { KpiCard, Money, Num, StatusBadge } from "@repo/ui";
import { PiggyBank } from "lucide-react";
import type { FC } from "react";
import { SampleAwareLink } from "~/components/navigation/SampleAwareLink";
import { WidgetCard } from "../WidgetCard";
import {
  actionLink,
  detailLabel,
  detailList,
  detailNote,
  detailRow,
  detailValue,
  widgetContent,
} from "./PensionWidget.styles";

export interface PensionWidgetProps {
  data: {
    totalPensionBalance: number;
    potsCount: number;
    employeePercent: number | null;
    employerPercent: number | null;
    isSalarySacrifice: boolean | null;
    monthlyContributionEst: number | null;
  };
  /** A retirement age the user has chosen. `null` or absent reads "Not set": never assumed. */
  targetRetirementAge?: number | null;
  onHide?: () => void;
}

/** Dashboard pension summary. Unknown contribution rates and retirement age read "Not set". */
export const PensionWidget: FC<PensionWidgetProps> = ({
  data,
  targetRetirementAge = null,
  onHide,
}) => {
  const { employeePercent, employerPercent } = data;
  const ratesKnown = employeePercent != null && employerPercent != null;
  const ratesAreDefault = employeePercent === 5 && employerPercent === 3;

  return (
    <WidgetCard href="/app/pension" icon={PiggyBank} id="pension" title="Pension" onHide={onHide}>
      <div className={widgetContent()}>
        <KpiCard
          deltaText={
            ratesKnown ? `${employeePercent + employerPercent}% total contribution` : undefined
          }
          label="Total pension value"
          subtext={`${data.potsCount} ${data.potsCount === 1 ? "pot" : "pots"} tracked`}
          value={<Money size="lg" value={data.totalPensionBalance} />}
        />
        <dl className={detailList()}>
          <div className={detailRow()}>
            <dt className={detailLabel()}>Contribution rates</dt>
            <dd className={detailValue()}>
              {ratesKnown ? (
                <>
                  <Num kind="percent" value={employeePercent} />
                  <span>employee +</span>
                  <Num kind="percent" value={employerPercent} />
                  <span>employer</span>
                </>
              ) : (
                <Money
                  notSetAction={
                    <SampleAwareLink className={actionLink()} to="/app/pension#pension-details">
                      Add contribution rates
                    </SampleAwareLink>
                  }
                  value={null}
                />
              )}
            </dd>
            {ratesKnown && ratesAreDefault && (
              <dd className={detailNote()}>
                Default: auto-enrolment minimum.{" "}
                <SampleAwareLink className={actionLink()} to="/app/pension#pension-details">
                  Change in your pension details
                </SampleAwareLink>
              </dd>
            )}
          </div>
          {data.isSalarySacrifice !== null && (
            <div className={detailRow()}>
              <dt className={detailLabel()}>Pay method</dt>
              <dd className={detailValue()}>
                <StatusBadge size="sm" variant={data.isSalarySacrifice ? "positive" : "neutral"}>
                  {data.isSalarySacrifice ? "Salary sacrifice" : "Net pay"}
                </StatusBadge>
              </dd>
            </div>
          )}
          <div className={detailRow()}>
            <dt className={detailLabel()}>Target retirement age</dt>
            <dd className={detailValue()}>
              <Num
                notSetAction={
                  <SampleAwareLink className={actionLink()} to="/app/pension">
                    Add retirement age
                  </SampleAwareLink>
                }
                value={targetRetirementAge}
              />
            </dd>
          </div>
        </dl>
      </div>
    </WidgetCard>
  );
};
