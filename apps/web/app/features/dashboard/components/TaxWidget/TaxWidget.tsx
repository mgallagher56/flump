import { Button, KpiCard, Money } from "@repo/ui";
import { Receipt } from "lucide-react";
import type { FC } from "react";
import { SampleAwareLink } from "~/components/navigation/SampleAwareLink";
import { WidgetCard } from "../WidgetCard";
import { detailLabel, detailList, detailRow, detailValue, widgetContent } from "./TaxWidget.styles";

export interface TaxWidgetProps {
  data: {
    taxYear: string;
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    /** `null` until a real, verified current-year estimate exists. Never an invented figure. */
    estimatedTaxDue: number | null;
    recordsCount: number;
  };
  onHide?: () => void;
}

/** Dashboard tax summary for the current tax year. Tax due reads "Not set" until it is verified. */
export const TaxWidget: FC<TaxWidgetProps> = ({ data, onHide }) => {
  const taxDue = data.estimatedTaxDue;
  return (
    <WidgetCard href="/app/tax" icon={Receipt} id="tax" title="Self Assessment" onHide={onHide}>
      <div className={widgetContent()}>
        <KpiCard
          emptyAction={
            <Button asChild size="sm" variant="ghost">
              <SampleAwareLink to="/app/tax">
                {data.recordsCount === 0 ? "Add income" : "Review tax records"}
              </SampleAwareLink>
            </Button>
          }
          label={`Estimated tax due, ${data.taxYear}`}
          subtext={taxDue === null ? "Calculated once tax estimates are verified" : "Estimate only"}
          value={taxDue === null ? null : <Money size="lg" value={taxDue} />}
        />
        <dl className={detailList()}>
          <div className={detailRow()}>
            <dt className={detailLabel()}>Income</dt>
            <dd className={detailValue()}>
              <Money value={data.totalIncome} />
            </dd>
          </div>
          <div className={detailRow()}>
            <dt className={detailLabel()}>Expenses</dt>
            <dd className={detailValue()}>
              <Money value={data.totalExpenses} />
            </dd>
          </div>
          <div className={detailRow()}>
            <dt className={detailLabel()}>Net profit</dt>
            <dd className={detailValue()}>
              <Money value={data.netProfit} />
            </dd>
          </div>
          <div className={detailRow()}>
            <dt className={detailLabel()}>Records</dt>
            <dd className={detailValue()}>{data.recordsCount}</dd>
          </div>
        </dl>
      </div>
    </WidgetCard>
  );
};
