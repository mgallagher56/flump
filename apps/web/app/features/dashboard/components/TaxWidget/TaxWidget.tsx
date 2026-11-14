import type { NextIncomeThreshold } from "@flump/finance-engine";
import {
  asAtTaxYear,
  Button,
  DELTA_PANEL_COPY,
  formatMoney,
  formatNumber,
  KpiCard,
  Money,
  StatusBadge,
  thresholdLabel,
} from "@repo/ui";
import { Receipt } from "lucide-react";
import type { FC } from "react";
import { SampleAwareLink } from "~/components/navigation/SampleAwareLink";
import { WidgetCard } from "../WidgetCard";
import {
  assumptionNote,
  detailLabel,
  detailList,
  detailRow,
  detailValue,
  marginalBadges,
  marginalBlock,
  marginalLink,
  marginalTitle,
  widgetContent,
} from "./TaxWidget.styles";

/** The engine's "next £1,000" facts for saved pay (E25-T14). Computed in the loader, never here. */
export interface TaxWidgetMarginal {
  nextThousandDeductedPct: number;
  takeHomeFromNextThousand: number;
  ratesYear: string;
  isUnverifiedEstimate: boolean;
  nextThreshold: NextIncomeThreshold | null;
}

export const TAX_WIDGET_COPY = {
  marginalTitle: "Your next £1,000 of pay",
  takeHome: "Estimated take-home",
  deducted: "Estimated share deducted",
  nextThreshold: "Next threshold",
  plannerLink: "Open the pay planner",
} as const;

export const thresholdDistance = (label: string, gross: string, distance: string): string =>
  `${label} at ${gross} gross pay, ${distance} above your pay`;

/** Where the pay planner lives: the take-home page owns "The next £1,000". */
export const TAX_PLANNER_HREF = "/app/take-home";

const pctDigits = (n: number) => (Number.isInteger(n) ? 0 : 1);

export interface TaxWidgetProps {
  data: {
    taxYear: string;
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    /**
     * The engine's self assessment estimate (tax on income outside PAYE) for the year; `null`
     * when there is no such income to estimate. Never an invented figure.
     */
    estimatedTaxDue: number | null;
    /** The engine's assumption notes for a known estimate (for example the bands it used). */
    estimatedTaxDueNotes?: readonly string[];
    recordsCount: number;
    /** `null` or absent until salary, employment type and pension details are saved. */
    marginal?: TaxWidgetMarginal | null;
  };
  onHide?: () => void;
}

export const TAX_DUE_UNKNOWN_SUBTEXT = "Shown once you add income not taxed through PAYE";
export const TAX_DUE_KNOWN_SUBTEXT = "Estimate of tax on income not taxed through PAYE";

/** Dashboard tax summary for the current tax year. Tax due reads "Not set" with nothing to estimate. */
export const TaxWidget: FC<TaxWidgetProps> = ({ data, onHide }) => {
  const taxDue = data.estimatedTaxDue;
  const marginal = data.marginal ?? null;
  return (
    <WidgetCard
      href="/app/self-assessment"
      icon={Receipt}
      id="tax"
      title="Self Assessment"
      onHide={onHide}
    >
      <div className={widgetContent()}>
        <KpiCard
          emptyAction={
            <Button asChild size="sm" variant="ghost">
              <SampleAwareLink to="/app/self-assessment">
                {data.recordsCount === 0 ? "Add income" : "Review tax records"}
              </SampleAwareLink>
            </Button>
          }
          label={`Estimated tax due, ${data.taxYear}`}
          subtext={taxDue === null ? TAX_DUE_UNKNOWN_SUBTEXT : TAX_DUE_KNOWN_SUBTEXT}
          value={
            taxDue === null ? null : (
              <span data-figure="tax.estimatedDue">
                <Money size="lg" value={taxDue} />
              </span>
            )
          }
        />
        {taxDue !== null
          ? (data.estimatedTaxDueNotes ?? []).map((note) => (
              <p key={note} className={assumptionNote()}>
                {note}
              </p>
            ))
          : null}
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
        {marginal ? (
          <div
            className={marginalBlock()}
            data-testid="tax-widget-marginal"
            id="tax-widget-marginal"
          >
            <p className={marginalTitle()}>{TAX_WIDGET_COPY.marginalTitle}</p>
            <div className={marginalBadges()}>
              <StatusBadge size="sm" variant="neutral">
                {asAtTaxYear(marginal.ratesYear)}
              </StatusBadge>
              <StatusBadge size="sm" variant={marginal.isUnverifiedEstimate ? "warning" : "info"}>
                {marginal.isUnverifiedEstimate
                  ? DELTA_PANEL_COPY.unverifiedBadge
                  : DELTA_PANEL_COPY.estimateBadge}
              </StatusBadge>
            </div>
            <dl className={detailList()}>
              <div className={detailRow()}>
                <dt className={detailLabel()}>{TAX_WIDGET_COPY.takeHome}</dt>
                <dd className={detailValue()}>
                  <Money fractionDigits={0} value={marginal.takeHomeFromNextThousand} />
                </dd>
              </div>
              <div className={detailRow()}>
                <dt className={detailLabel()}>{TAX_WIDGET_COPY.deducted}</dt>
                <dd className={detailValue()}>
                  {
                    formatNumber(marginal.nextThousandDeductedPct, {
                      kind: "percent",
                      fractionDigits: pctDigits(marginal.nextThousandDeductedPct),
                    }).text
                  }
                </dd>
              </div>
              {marginal.nextThreshold ? (
                <div className={detailRow()}>
                  <dt className={detailLabel()}>{TAX_WIDGET_COPY.nextThreshold}</dt>
                  <dd className={detailValue()}>
                    {thresholdDistance(
                      thresholdLabel(marginal.nextThreshold),
                      formatMoney(marginal.nextThreshold.grossAt, { fractionDigits: 0 }).text,
                      formatMoney(marginal.nextThreshold.distance, { fractionDigits: 0 }).text,
                    )}
                  </dd>
                </div>
              ) : null}
            </dl>
            <SampleAwareLink className={marginalLink()} to={TAX_PLANNER_HREF}>
              {TAX_WIDGET_COPY.plannerLink}
            </SampleAwareLink>
          </div>
        ) : null}
      </div>
    </WidgetCard>
  );
};
