import { Icon, Money, Num, ProgressBar } from "@repo/ui";
import { Hourglass } from "lucide-react";
import type { FC } from "react";
import {
  content,
  headline,
  label,
  meta,
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
import { runwayRow, spendingBlock } from "./BudgetWidget.styles";

/** Figures from the loader's financial picture (E23): the widget never recomputes them. */
export interface BudgetWidgetData {
  /** Budgeted income rows, monthly. */
  monthlyIncome: number;
  annualSalary?: number | null;
  /** Essentials plus discretionary (savings is its own line). */
  monthlyExpenses: number;
  /** null when there is no income row (a surplus would only be minus the spending). */
  monthlySurplus: number | null;
  savingsRatePct: number;
  /** From the loader's picture: whether any budget row exists. Sample data may omit it. */
  budgetKnown?: boolean;
  /** Months of cover from saved data only, or null when it cannot be worked out. */
  monthsOfCover: number | null;
  budgetedSavings?: number;
  livingExpenses?: number;
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

/** Budgeted income, surplus, savings rate, months of cover and spending against income. */
export const BudgetWidget: FC<BudgetWidgetProps> = ({ data }) => {
  const income = data && finite(data.monthlyIncome) ? data.monthlyIncome : 0;
  const expenses = data && finite(data.monthlyExpenses) ? data.monthlyExpenses : 0;
  // With no budget rows, surplus and months of cover are unknown, not zero. The loader's picture
  // decides; sample data without the flag falls back to its own totals.
  const budgetKnown =
    typeof data?.budgetKnown === "boolean" ? data.budgetKnown : income > 0 || expenses > 0;
  const incomeKnown = income > 0;

  const monthsOfCover = data && finite(data.monthsOfCover) ? data.monthsOfCover : null;

  if (!data || !budgetKnown) {
    return (
      <WidgetCard href="/app/budget" icon={WIDGET_ICONS.budget} id="budget" title="Budget">
        <div className={content()}>
          <div className={headline()} role="status">
            <p className={label()}>Monthly surplus</p>
            <p className={notSetWrap()}>
              <NotSetValue href="/app/budget" subject="your budget" />
            </p>
          </div>
        </div>
      </WidgetCard>
    );
  }

  const surplus = finite(data.monthlySurplus) ? data.monthlySurplus : 0;
  const budgetedSavings =
    finite(data.budgetedSavings) && data.budgetedSavings > 0 ? data.budgetedSavings : 0;
  const salary =
    finite(data.annualSalary) && (data.annualSalary as number) > 0
      ? (data.annualSalary as number)
      : null;
  const spendPct = incomeKnown ? Math.min(100, Math.round((expenses / income) * 100)) : null;

  return (
    <WidgetCard href="/app/budget" icon={WIDGET_ICONS.budget} id="budget" title="Budget">
      <div className={content()}>
        <div className={headline()} role="status">
          {incomeKnown ? (
            <>
              <p className={label()}>{surplus >= 0 ? "Monthly surplus" : "Monthly deficit"}</p>
              <span className={statValue()}>
                <span data-figure="budget.surplus">
                  <Money
                    signDisplay="always"
                    size="lg"
                    tone={surplus < 0 ? "danger" : surplus > 0 ? "positive" : "default"}
                    value={surplus}
                  />
                </span>
                <span className={unit()}>a month</span>
              </span>
            </>
          ) : (
            // Without income a surplus or deficit would only be minus the expenses: unknown.
            <>
              <p className={label()}>Monthly surplus</p>
              <p className={notSetWrap()}>
                <NotSetValue
                  actionLabel="Add"
                  href="/app/budget"
                  id="budget-widget-add-income-for-surplus"
                  subject="income"
                />
              </p>
            </>
          )}
        </div>

        <dl className={statRow()}>
          <div className={statTile()}>
            <dt className={statLabel()}>Budgeted income</dt>
            <dd className={statValue()}>
              {incomeKnown ? (
                <span data-figure="budget.income">
                  <Money value={income} />
                </span>
              ) : (
                <NotSetValue
                  actionLabel="Add"
                  href="/app/budget"
                  id="budget-widget-add-income"
                  subject="income"
                />
              )}
            </dd>
          </div>
          <div className={statTile()}>
            <dt className={statLabel()}>Savings rate</dt>
            <dd className={statValue()}>
              {incomeKnown && finite(data.savingsRatePct) ? (
                <Num fractionDigits={0} kind="percent" value={data.savingsRatePct} />
              ) : (
                <NotSetValue
                  actionLabel="Add"
                  href="/app/budget"
                  id="budget-widget-add-income-for-rate"
                  subject="income"
                />
              )}
            </dd>
          </div>
        </dl>

        {salary !== null || budgetedSavings > 0 ? (
          <p className={meta()}>
            {salary !== null ? (
              <>
                Gross salary <Money size="sm" value={salary} /> a year.{" "}
              </>
            ) : null}
            {budgetedSavings > 0 ? (
              <>
                Savings rate includes <Money size="sm" value={budgetedSavings} /> a month budgeted.
              </>
            ) : null}
          </p>
        ) : null}

        <div className={runwayRow()}>
          <span className={statLabel()}>
            <Icon icon={Hourglass} size="sm" /> Months of cover
          </span>
          {monthsOfCover !== null ? (
            <span className={statValue()} data-figure="monthsOfCover">
              {formatMonthsOfCover(monthsOfCover)}
            </span>
          ) : (
            <NotSetValue
              actionLabel="Add"
              href="/app/budget"
              id="budget-widget-add-runway"
              subject="essential spending"
            />
          )}
        </div>

        {incomeKnown && spendPct !== null ? (
          <div className={spendingBlock()}>
            <ProgressBar
              label="Spending as a share of income"
              max={income}
              value={Math.min(expenses, income)}
              valueDisplay={`${spendPct}% of income`}
              variant={surplus < 0 ? "danger" : "positive"}
            />
            <p className={note()}>
              <Money size="sm" value={income} /> in, <Money size="sm" value={expenses} /> out each
              month.
            </p>
          </div>
        ) : null}
      </div>
    </WidgetCard>
  );
};

export default BudgetWidget;
