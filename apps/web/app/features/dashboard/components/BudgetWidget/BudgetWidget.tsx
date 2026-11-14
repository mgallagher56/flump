import { Money } from "@repo/ui";
import type { FC } from "react";
import { WIDGET_ICONS } from "../../widgetIcons";
import { WidgetCard } from "../WidgetCard";

/** Figures from the loader's financial picture (E23): the card never recomputes them. */
export interface BudgetWidgetData {
  monthlyIncome?: number;
  /** Essentials plus discretionary (savings is its own line). */
  monthlyExpenses: number;
  /** From the loader's picture: whether any budget row exists. Sample data may omit it. */
  budgetKnown?: boolean;
}

export interface BudgetWidgetProps {
  data?: BudgetWidgetData | null;
}

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/** "4.7 months", "1 month", "10+ years". Plain wording: no target is implied. */
export const formatMonthsOfCover = (months: number): string => {
  if (months > 120) return `${Math.floor(months / 12)}+ years`;
  const value = Math.max(0, months);
  const text = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 }).format(value);
  return `${text} ${value === 1 ? "month" : "months"}`;
};

/**
 * The budget section card: spending each month. What is left over and months of cover are in the
 * dashboard's KPI strip, so they do not repeat here (E16 P6).
 */
export const BudgetWidget: FC<BudgetWidgetProps> = ({ data }) => {
  const expenses = data && finite(data.monthlyExpenses) ? data.monthlyExpenses : 0;
  const income = data && finite(data.monthlyIncome) ? data.monthlyIncome : 0;
  const budgetKnown =
    typeof data?.budgetKnown === "boolean" ? data.budgetKnown : income > 0 || expenses > 0;

  return (
    <WidgetCard
      domain="pay"
      figure={
        budgetKnown ? (
          <span data-figure="budget.outgoings">
            <Money fractionDigits={0} size="lg" value={expenses} />
          </span>
        ) : null
      }
      icon={WIDGET_ICONS.budget}
      id="budget"
      label="Spending each month"
      line={
        budgetKnown
          ? "Bills and living costs in your budget."
          : "Add your budget to see what you spend each month."
      }
      link={
        budgetKnown
          ? { to: "/app/budget", label: "Open budget" }
          : { to: "/app/budget", label: "Add your budget" }
      }
      title="Budget"
    />
  );
};

export default BudgetWidget;
