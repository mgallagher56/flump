import type { FC } from "react";
import type { DebtSummary } from "~/utils/debtSummary";
import { WIDGET_ICONS } from "../../widgetIcons";
import { WidgetCard } from "../WidgetCard";

export interface DebtWidgetProps {
  data?: DebtSummary | null;
}

/** True when the card shows the debt-free date, an estimate that needs the page's notice. */
export const debtCardShowsEstimate = (data: DebtSummary | null | undefined): boolean =>
  Boolean(
    data &&
      data.totalDebt > 0 &&
      !data.debts?.some((debt) => debt.aprKnown === false) &&
      data.debtFreeDate,
  );

/**
 * The debt section card, the same for everyone (R4 ruling): the debt-free date at minimum
 * payments, labelled as an estimate. The total owed sits in the KPI strip, so it does not repeat.
 * No badges, no rate judgements.
 */
export const DebtWidget: FC<DebtWidgetProps> = ({ data = null }) => {
  // An unset APR would be modelled as 0%, so the date is withheld and the user is asked for it.
  const aprUnknown = Boolean(data?.debts?.some((debt) => debt.aprKnown === false));
  const hasDebt = Boolean(data && data.totalDebt > 0);
  const date = hasDebt && !aprUnknown ? (data?.debtFreeDate ?? null) : null;

  const line = !hasDebt
    ? "Add a credit card, loan or overdraft to see when it would be paid off."
    : aprUnknown
      ? "Add the APR on each debt to see a debt-free date."
      : date
        ? "Assumes you pay the minimum on each debt every month."
        : "Not paid off at the minimum payments you have added.";

  return (
    <WidgetCard
      domain="debt"
      figure={date ? <span data-figure-kind="date">{date}</span> : null}
      icon={WIDGET_ICONS.debt}
      id="debt"
      label="Debt-free date (estimate)"
      line={line}
      link={
        !hasDebt
          ? { to: "/app/accounts", label: "Add a debt" }
          : aprUnknown
            ? { to: "/app/accounts", label: "Add your rates" }
            : { to: "/app/debt", label: "Open debt" }
      }
      title="Debt"
    />
  );
};

export default DebtWidget;
