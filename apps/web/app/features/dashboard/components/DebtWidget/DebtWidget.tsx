import { Icon, Money, StatusBadge } from "@repo/ui";
import { CalendarCheck, Flame } from "lucide-react";
import type { FC } from "react";
import type { DebtSummary } from "~/utils/debtSummary";
import {
  content,
  headline,
  label,
  note,
  notSetWrap,
  statLabel,
  statRow,
  statTile,
  statValue,
} from "../../widgetBody.styles";
import { WIDGET_ICONS } from "../../widgetIcons";
import { NotSetValue } from "../NotSetValue";
import { WidgetCard } from "../WidgetCard";
import { headlineRow, statTextValue } from "./DebtWidget.styles";

export interface DebtWidgetProps {
  data?: DebtSummary | null;
}

/** Unsecured debt total, debt-free date and minimum payments. */
export const DebtWidget: FC<DebtWidgetProps> = ({ data = null }) => {
  // An unset APR would be modelled as 0%, so the payoff date is withheld and the user is asked for it.
  const aprUnknown = Boolean(data?.debts?.some((debt) => debt.aprKnown === false));
  const highApr = data?.highInterestCount ?? 0;

  return (
    <WidgetCard href="/app/debt" icon={WIDGET_ICONS.debt} id="debt" title="Debt">
      <div className={content()}>
        {data ? (
          <>
            <div className={headlineRow()}>
              <div className={headline()} role="status">
                <p className={label()}>Total unsecured debt</p>
                <Money size="lg" value={data.totalDebt} />
              </div>
              {highApr > 0 ? (
                <StatusBadge icon={<Icon icon={Flame} size="sm" />} size="sm" variant="danger">
                  {highApr} high APR {highApr === 1 ? "account" : "accounts"}
                </StatusBadge>
              ) : null}
            </div>

            <dl className={statRow()}>
              <div className={statTile()}>
                <dt className={statLabel()}>
                  <Icon icon={CalendarCheck} size="sm" /> Debt-free date
                </dt>
                <dd className={statValue()}>
                  {aprUnknown ? (
                    <span className={statTextValue()}>
                      <NotSetValue
                        actionLabel="Add"
                        href="/app/accounts"
                        id="debt-widget-add-apr"
                        subject="APR"
                      />
                    </span>
                  ) : (
                    <span className={statTextValue()}>{data.debtFreeDate ?? "Not calculated"}</span>
                  )}
                </dd>
              </div>

              <div className={statTile()}>
                <dt className={statLabel()}>
                  {data.monthlyMinimumEstimated
                    ? "Monthly minimums (estimated)"
                    : "Monthly minimums"}
                </dt>
                <dd className={statValue()}>
                  <Money value={data.monthlyMinimumTotal} />
                </dd>
              </div>
            </dl>

            <p className={note()}>
              {aprUnknown
                ? "Add the APR on each debt to see a debt-free date."
                : "Debt-free date assumes minimum payments only."}
            </p>
          </>
        ) : (
          <div className={headline()}>
            <p className={label()}>Total unsecured debt</p>
            <p className={notSetWrap()}>
              <NotSetValue
                actionLabel="Add"
                href="/app/accounts"
                id="debt-widget-empty"
                label="No debts added"
                subject="a debt"
              />
            </p>
            <p className={note()}>
              Add a credit card, loan or overdraft on Accounts to see your payoff date.
            </p>
          </div>
        )}
      </div>
    </WidgetCard>
  );
};

export default DebtWidget;
