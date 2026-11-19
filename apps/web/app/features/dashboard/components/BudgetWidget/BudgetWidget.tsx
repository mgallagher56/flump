import { Money } from "@repo/ui";
import type { FC } from "react";
import { BREATHING_ROOM_LABEL, breathingRoomPhrase } from "~/utils/breathingRoom";
import { WIDGET_ICONS } from "../../widgetIcons";
import { WidgetCard } from "../WidgetCard";
import { monthsOfCoverText } from "./BudgetWidget.styles";

/** Figures from the loader's financial picture (E23): the card never recomputes them. */
export interface BudgetWidgetData {
  monthlyIncome?: number;
  /** Essentials plus discretionary (savings is its own line). */
  monthlyExpenses: number;
  /** From the loader's picture: whether any budget row exists. Sample data may omit it. */
  budgetKnown?: boolean;
  /** The engine's months of cover, shown as "Breathing room". Null or missing when not known. */
  monthsOfCover?: number | null;
}

export interface BudgetWidgetProps {
  data?: BudgetWidgetData | null;
}

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/**
 * The budget section card: spending each month, with breathing room as its one line when the
 * picture knows it (owner wording, 15 November 2026: "Breathing room: about 1.5 months"). The
 * figure is the loader's, the same one the Budget page shows.
 */
export const BudgetWidget: FC<BudgetWidgetProps> = ({ data }) => {
  const expenses = data && finite(data.monthlyExpenses) ? data.monthlyExpenses : 0;
  const income = data && finite(data.monthlyIncome) ? data.monthlyIncome : 0;
  const budgetKnown =
    typeof data?.budgetKnown === "boolean" ? data.budgetKnown : income > 0 || expenses > 0;
  const months = data && finite(data.monthsOfCover) ? data.monthsOfCover : null;

  return (
    <WidgetCard
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
        !budgetKnown ? (
          "Add your budget to see what you spend each month."
        ) : months === null ? (
          "Bills and living costs in your budget."
        ) : (
          <>
            {BREATHING_ROOM_LABEL}:{" "}
            <span className={monthsOfCoverText()} data-figure="monthsOfCover">
              {breathingRoomPhrase(months)}
            </span>
          </>
        )
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
