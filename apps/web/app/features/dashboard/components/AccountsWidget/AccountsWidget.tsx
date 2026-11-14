import type { FC } from "react";
import { WIDGET_ICONS } from "../../widgetIcons";
import { WidgetCard } from "../WidgetCard";

export interface AccountsWidgetData {
  accountsCount: number;
}

export interface AccountsWidgetProps {
  data?: AccountsWidgetData | null;
}

/**
 * The accounts section card: how many accounts are added. Net worth is the page's hero and the
 * split of what you own and owe belongs to the accounts page (E16 P6), so neither repeats here.
 */
export const AccountsWidget: FC<AccountsWidgetProps> = ({ data }) => {
  const count = data?.accountsCount ?? 0;
  return (
    <WidgetCard
      domain="net-worth"
      figure={count > 0 ? `${count} ${count === 1 ? "account" : "accounts"}` : null}
      icon={WIDGET_ICONS.accounts}
      id="accounts"
      label="Accounts added"
      line={
        count > 0
          ? "Balances and history for each account."
          : "Add an account to see your net worth."
      }
      link={
        count > 0
          ? { to: "/app/accounts", label: "Open accounts" }
          : { to: "/app/accounts", label: "Add an account" }
      }
      title="Accounts"
    />
  );
};

export default AccountsWidget;
