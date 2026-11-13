import { Money, Num } from "@repo/ui";
import type { FC } from "react";
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
  unit,
} from "../../widgetBody.styles";
import { WIDGET_ICONS } from "../../widgetIcons";
import { NotSetValue } from "../NotSetValue";
import { WidgetCard } from "../WidgetCard";
import { futureValue } from "./futureValue";
import { forecastBox, forecastTitle } from "./SavingsWidget.styles";

/** Saved per-widget settings still apply; there is no editor for them on the dashboard. */
export interface SavingsWidgetConfig {
  horizonYears?: 1 | 3 | 5;
  showCompoundReturn?: boolean;
}

export interface SavingsWidgetData {
  totalSavingsBalance: number;
  totalMonthlyContributions: number;
  /** The real weighted rate from the user's accounts, or null when unknown. */
  weightedInterestRate: number | null;
  accountsCount: number;
}

export interface SavingsWidgetProps {
  data?: SavingsWidgetData | null;
  config?: SavingsWidgetConfig;
}

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/** Savings and investment balance, average rate, contributions and a short compound forecast. */
export const SavingsWidget: FC<SavingsWidgetProps> = ({ data, config = {} }) => {
  const horizonYears = config.horizonYears ?? 1;
  const showForecast = config.showCompoundReturn !== false;

  const hasBalance = Boolean(data && data.accountsCount > 0 && finite(data.totalSavingsBalance));
  const rate = data && finite(data.weightedInterestRate) ? data.weightedInterestRate : null;
  // A zero total means no contribution has been entered: show it as unknown, not as £0.
  const contribution =
    data && finite(data.totalMonthlyContributions) && data.totalMonthlyContributions > 0
      ? data.totalMonthlyContributions
      : null;

  const forecast =
    hasBalance && data && rate !== null
      ? futureValue({
          balance: data.totalSavingsBalance,
          monthlyContribution: contribution ?? 0,
          annualRatePct: rate,
          years: horizonYears,
        })
      : null;

  return (
    <WidgetCard href="/app/savings" icon={WIDGET_ICONS.savings} id="savings" title="Savings">
      <div className={content()}>
        <div className={headline()} role="status">
          <p className={label()}>Savings and investments</p>
          {hasBalance && data ? (
            <Money size="lg" value={data.totalSavingsBalance} />
          ) : (
            <p className={notSetWrap()}>
              <NotSetValue href="/app/savings" subject="a savings account" />
            </p>
          )}
        </div>

        {hasBalance ? (
          <dl className={statRow()}>
            <div className={statTile()}>
              <dt className={statLabel()}>Average AER</dt>
              <dd className={statValue()}>
                {rate !== null ? (
                  <Num fractionDigits={2} kind="percent" value={rate} />
                ) : (
                  <NotSetValue
                    actionLabel="Add"
                    href="/app/savings"
                    id="savings-widget-add-rate"
                    subject="interest rate"
                  />
                )}
              </dd>
            </div>
            <div className={statTile()}>
              <dt className={statLabel()}>Monthly savings</dt>
              <dd className={statValue()}>
                {contribution !== null ? (
                  <>
                    <Money value={contribution} />
                    <span className={unit()}>a month</span>
                  </>
                ) : (
                  <NotSetValue
                    actionLabel="Add"
                    href="/app/savings"
                    id="savings-widget-add-contribution"
                    subject="monthly savings"
                  />
                )}
              </dd>
            </div>
          </dl>
        ) : null}

        {hasBalance && showForecast ? (
          <div className={forecastBox()} role="status">
            <p className={forecastTitle()}>
              {horizonYears === 1 ? "1-year" : `${horizonYears}-year`} forecast
            </p>
            {forecast ? (
              <>
                <Money size="md" value={forecast.projectedTotal} />
                <p className={note()}>
                  Includes about <Money size="sm" value={forecast.interestEarned} tone="muted" /> in
                  interest at your current average rate. An estimate, not a promise.
                </p>
              </>
            ) : (
              <p className={notSetWrap()}>
                <NotSetValue
                  actionLabel="Add"
                  href="/app/savings"
                  id="savings-widget-forecast-add-rate"
                  subject="interest rate"
                />
              </p>
            )}
          </div>
        ) : null}
      </div>
    </WidgetCard>
  );
};

export default SavingsWidget;
