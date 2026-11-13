import { Icon, Money, Num, ProgressBar, StatusBadge } from "@repo/ui";
import { Hourglass } from "lucide-react";
import { type FC, useMemo } from "react";
import { NotSet } from "~/features/feedback/components/NotSet";
import { calculateRunwayStats, loadRunwaySettings } from "~/utils/runwayStorage";
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
import { WidgetCard } from "../WidgetCard";
import { runwayRow, spendingBlock } from "./BudgetWidget.styles";

export interface BudgetWidgetData {
  monthlyIncome: number;
  annualSalary?: number | null;
  monthlyExpenses: number;
  monthlySurplus: number;
  savingsRatePct: number;
  runwayMonths: number | null;
  runwayLabel?: string;
  budgetedSavings?: number;
  livingExpenses?: number;
  rawEntries?: any[];
  rawAccounts?: any[];
  rawAccountDetails?: any[];
}

export interface BudgetWidgetProps {
  data?: BudgetWidgetData | null;
}

interface Runway {
  /** Text to show, or null when the runway cannot be worked out. */
  text: string | null;
  months: number | null;
}

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export const formatRunway = (months: number): string => {
  if (months <= 0) return "0 mos";
  if (months > 120) return `${Math.floor(months / 12)}+ yrs`;
  const years = Math.floor(months / 12);
  const rest = Math.round((months % 12) * 10) / 10;
  if (years > 0) {
    return rest > 0
      ? `${years} yr${years !== 1 ? "s" : ""} ${rest} mo${rest !== 1 ? "s" : ""}`
      : `${years} yr${years !== 1 ? "s" : ""}`;
  }
  return `${Math.round(months * 10) / 10} mos`;
};

const runwayVariant = (months: number | null) => {
  if (months === null) return "neutral" as const;
  if (months < 1) return "danger" as const;
  if (months < 3) return "warning" as const;
  return "positive" as const;
};

/** Monthly take-home, surplus, savings rate, runway and spending against income. */
export const BudgetWidget: FC<BudgetWidgetProps> = ({ data }) => {
  const income = data && finite(data.monthlyIncome) ? data.monthlyIncome : 0;
  const expenses = data && finite(data.monthlyExpenses) ? data.monthlyExpenses : 0;
  // With neither income nor expenses entered, surplus and runway are unknown, not zero.
  const budgetKnown = income > 0 || expenses > 0;
  const incomeKnown = income > 0;

  const runway = useMemo<Runway>(() => {
    if (!data || !budgetKnown) return { text: null, months: null };
    if (typeof window !== "undefined" && data.rawEntries && data.rawAccounts) {
      const activeSettings = loadRunwaySettings();
      if (activeSettings) {
        const stats = calculateRunwayStats({
          entries: data.rawEntries,
          accounts: data.rawAccounts,
          accountDetails: data.rawAccountDetails,
          savedSettings: activeSettings,
        });
        return {
          text: stats.shortLabel,
          months: finite(stats.runwayMonths) ? stats.runwayMonths : null,
        };
      }
    }
    if (data.runwayMonths !== null && data.runwayMonths !== undefined) {
      if (!Number.isFinite(data.runwayMonths)) return { text: "No burn", months: null };
      return { text: formatRunway(data.runwayMonths), months: data.runwayMonths };
    }
    if (data.runwayLabel && !data.runwayLabel.toLowerCase().includes("runway")) {
      return { text: data.runwayLabel, months: null };
    }
    return { text: null, months: null };
  }, [data, budgetKnown]);

  if (!data || !budgetKnown) {
    return (
      <WidgetCard href="/app/budget" icon={WIDGET_ICONS.budget} id="budget" title="Budget">
        <div className={content()}>
          <div className={headline()} role="status">
            <p className={label()}>Monthly surplus</p>
            <p className={notSetWrap()}>
              <NotSet href="/app/budget" subject="your budget" />
            </p>
          </div>
        </div>
      </WidgetCard>
    );
  }

  const surplus = finite(data.monthlySurplus) ? data.monthlySurplus : income - expenses;
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
                <Money
                  signDisplay="always"
                  size="lg"
                  tone={surplus < 0 ? "danger" : surplus > 0 ? "positive" : "default"}
                  value={surplus}
                />
                <span className={unit()}>a month</span>
              </span>
            </>
          ) : (
            // Without income a surplus or deficit would only be minus the expenses: unknown.
            <>
              <p className={label()}>Monthly surplus</p>
              <p className={notSetWrap()}>
                <NotSet
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
            <dt className={statLabel()}>Monthly take-home</dt>
            <dd className={statValue()}>
              {incomeKnown ? (
                <Money value={income} />
              ) : (
                <NotSet
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
                <NotSet
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
            <Icon icon={Hourglass} size="sm" /> Emergency runway
          </span>
          {runway.text ? (
            <StatusBadge size="sm" variant={runwayVariant(runway.months)}>
              {runway.text}
            </StatusBadge>
          ) : (
            <NotSet
              actionLabel="Add"
              href="/app/budget"
              id="budget-widget-add-runway"
              subject="runway details"
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
