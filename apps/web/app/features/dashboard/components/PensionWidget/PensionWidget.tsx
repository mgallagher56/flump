import { formatNumber, Money } from "@repo/ui";
import type { FC } from "react";
import { WIDGET_ICONS } from "../../widgetIcons";
import { WidgetCard } from "../WidgetCard";

export interface PensionWidgetProps {
  data: {
    totalPensionBalance: number;
    potsCount: number;
    employeePercent: number | null;
    employerPercent: number | null;
  };
  /**
   * The KPI strip already shows the pension pots (no debt to show there), so the card shows the
   * contribution rate instead: a figure appears once per page (E16 P6).
   */
  potInStrip?: boolean;
}

/** The pension section card: the pots total, or the contribution rate when the strip has the pot. */
export const PensionWidget: FC<PensionWidgetProps> = ({ data, potInStrip = false }) => {
  if (!potInStrip) {
    const known = data.potsCount > 0 && Number.isFinite(data.totalPensionBalance);
    return (
      <WidgetCard
        domain="pension"
        figure={
          known ? <Money fractionDigits={0} size="lg" value={data.totalPensionBalance} /> : null
        }
        icon={WIDGET_ICONS.pension}
        id="pension"
        label="Pension pots"
        line={known ? "Across the pension pots you have added." : "Add a pension to see it here."}
        link={
          known
            ? { to: "/app/pension", label: "Open pension" }
            : { to: "/app/accounts", label: "Add a pension" }
        }
        title="Pension"
      />
    );
  }

  const { employeePercent, employerPercent } = data;
  const ratesKnown = employeePercent != null && employerPercent != null;
  const total = ratesKnown ? employeePercent + employerPercent : null;
  return (
    <WidgetCard
      domain="pension"
      figure={
        total === null
          ? null
          : formatNumber(total, {
              kind: "percent",
              fractionDigits: Number.isInteger(total) ? 0 : 1,
            }).text
      }
      icon={WIDGET_ICONS.pension}
      id="pension"
      label="Paid in, as a share of pay"
      line={
        ratesKnown
          ? "You and your employer together."
          : "Add what you and your employer pay in to see it here."
      }
      link={
        ratesKnown
          ? { to: "/app/pension", label: "Open pension" }
          : { to: "/app/pension#pension-details", label: "Add contribution rates" }
      }
      title="Pension"
    />
  );
};

export default PensionWidget;
