import { Money } from "@repo/ui";
import type { FC } from "react";
import { WIDGET_ICONS } from "../../widgetIcons";
import { WidgetCard } from "../WidgetCard";

export interface SavingsWidgetData {
  totalSavingsBalance: number;
  accountsCount: number;
}

export interface SavingsWidgetProps {
  data?: SavingsWidgetData | null;
}

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/** The savings section card: the saved balance across savings and investment accounts. */
export const SavingsWidget: FC<SavingsWidgetProps> = ({ data }) => {
  const known = Boolean(data && data.accountsCount > 0 && finite(data.totalSavingsBalance));
  return (
    <WidgetCard
      domain="savings"
      figure={
        known && data ? (
          <Money fractionDigits={0} size="lg" value={data.totalSavingsBalance} />
        ) : null
      }
      icon={WIDGET_ICONS.savings}
      id="savings"
      label="Savings and investments"
      line={
        known
          ? "Across your savings and investment accounts."
          : "Add a savings account to see your balance here."
      }
      link={
        known
          ? { to: "/app/savings", label: "Open savings" }
          : { to: "/app/accounts", label: "Add a savings account" }
      }
      title="Savings"
    />
  );
};

export default SavingsWidget;
