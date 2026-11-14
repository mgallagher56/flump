import { DELTA_PANEL_COPY, Money, StatusBadge } from "@repo/ui";
import type { FC } from "react";
import { WIDGET_ICONS } from "../../widgetIcons";
import { WidgetCard } from "../WidgetCard";
import { taxFigure } from "./TaxWidget.styles";

export interface TaxWidgetProps {
  data: {
    /**
     * The engine's self assessment estimate (tax on income outside PAYE) for the year; `null`
     * when there is no such income to estimate. Never an invented figure.
     */
    estimatedTaxDue: number | null;
    recordsCount: number;
  };
}

/** The label on the tax figure. The "Unverified estimate" badge sits beside the figure (ruling 3). */
export const TAX_DUE_LABEL = "Tax due this tax year";

/** True when the card shows a tax figure, which needs the "Unverified estimate" notice. */
export const taxCardShowsEstimate = (data: TaxWidgetProps["data"] | null | undefined): boolean =>
  typeof data?.estimatedTaxDue === "number" && Number.isFinite(data.estimatedTaxDue);

/**
 * The Self Assessment section card: the estimated tax due on income not taxed through PAYE, with
 * the standard "Unverified estimate" badge beside the figure. The full sentence is in the page's
 * one notice, not here.
 */
export const TaxWidget: FC<TaxWidgetProps> = ({ data }) => {
  const known = taxCardShowsEstimate(data);
  return (
    <WidgetCard
      domain="tax"
      figure={
        known ? (
          <span className={taxFigure()}>
            <span data-figure="tax.estimatedDue">
              <Money fractionDigits={0} size="lg" value={data.estimatedTaxDue} />
            </span>
            <StatusBadge
              data-testid="tax-unverified-badge"
              id="tax-unverified-badge"
              size="sm"
              variant="neutral"
            >
              {DELTA_PANEL_COPY.unverifiedBadge}
            </StatusBadge>
          </span>
        ) : null
      }
      icon={WIDGET_ICONS.tax}
      id="tax"
      label={TAX_DUE_LABEL}
      line={
        known
          ? "Tax on income not taxed through PAYE."
          : "Shown once you add income not taxed through PAYE."
      }
      link={
        data.recordsCount === 0
          ? { to: "/app/self-assessment", label: "Add income" }
          : { to: "/app/self-assessment", label: "Open tax records" }
      }
      title="Self Assessment"
    />
  );
};

export default TaxWidget;
