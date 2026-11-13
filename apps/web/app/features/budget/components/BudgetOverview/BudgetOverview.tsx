import { type FinancialPicture, isFigureKnown } from "@flump/finance-engine";
import {
  Button,
  Card,
  CollapsibleDrawer,
  Icon,
  KpiCard,
  KpiStrip,
  Money,
  StatusBadge,
} from "@repo/ui";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { type FC, useMemo } from "react";
import { SampleAwareLink } from "~/components/navigation/SampleAwareLink";
import type { BudgetCategory, BudgetEntry } from "~/types/budget";
import {
  CATEGORY_LABELS,
  getDaysUntilContractEnd,
  isPriorityBill,
  toMonthly,
} from "~/types/budget";
import { buildWorkspacePicture } from "~/utils/financialPicture";
import { ExpenseBreakdown } from "../ExpenseBreakdown";
import {
  dangerIcon,
  helplineLink,
  helplineList,
  heroSubtext,
  mutedText,
  noticeBody,
  noticeCard,
  noticeHeader,
  noticeTitle,
  overviewRoot,
  renewalList,
  renewalName,
  renewalRow,
  section,
  sectionHeader,
  sectionTitle,
  splitCard,
  splitGrid,
  splitNote,
  splitTitle,
  warningIcon,
} from "./BudgetOverview.styles";

export interface BudgetOverviewProps {
  entries: BudgetEntry[];
  /**
   * The engine's figures for these entries (built by the container with the same function the
   * loaders use). The overview never adds rows up itself (E23 section 2).
   */
  picture?: Pick<FinancialPicture, "budget" | "safeToSpend" | "monthsOfCover">;
  customCategories?: string[];
  onNavigateToCategory: (cat: BudgetCategory) => void;
  onNavigateToRunway: () => void;
}

const EXPENSE_CATEGORIES: BudgetCategory[] = ["housing", "bills", "expenses"];

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const BudgetOverview: FC<BudgetOverviewProps> = ({
  entries,
  picture: pictureProp,
  customCategories = [],
  onNavigateToCategory,
  onNavigateToRunway,
}) => {
  // Without a picture from the container, the same engine builder runs on the entries alone
  // (no profile, so safe to spend shows Not set rather than a guess).
  const picture = useMemo(
    () => pictureProp ?? buildWorkspacePicture({ budgetEntries: entries }),
    [pictureProp, entries],
  );
  const budget = isFigureKnown(picture.budget) ? picture.budget.value : null;
  const totals = {
    income: budget?.income ?? 0,
    expenses: budget?.outgoings ?? 0,
    budgetedSavings: budget?.savings ?? 0,
    surplus: budget?.surplus ?? 0,
  };
  const safeToSpend = isFigureKnown(picture.safeToSpend) ? picture.safeToSpend.value : null;
  const salaryMissing =
    !isFigureKnown(picture.safeToSpend) &&
    picture.safeToSpend.missing.some((key) => !key.startsWith("budget"));

  const expenseCategories = useMemo(() => {
    const set = new Set<string>(EXPENSE_CATEGORIES);
    for (const c of customCategories) {
      if (c === "savings") continue;
      const catEntries = entries.filter((e) => e.category === c);
      const isPureIncome = catEntries.length > 0 && catEntries.every((e) => e.isIncome);
      if (!isPureIncome) set.add(c);
    }
    for (const e of entries) {
      if (!e.isIncome && e.category && e.category !== "savings") set.add(e.category);
    }
    return Array.from(set);
  }, [customCategories, entries]);

  const categoryTotals = useMemo(
    () =>
      expenseCategories.map((cat) => {
        const inCategory = entries.filter((e) => e.category === cat);
        return {
          cat,
          label: CATEGORY_LABELS[cat] || cat,
          total: inCategory.reduce((s, e) => s + toMonthly(e), 0),
          count: inCategory.length,
        };
      }),
    [expenseCategories, entries],
  );

  const split = useMemo(() => {
    const priorityItems = entries.filter((e) => !e.isIncome && isPriorityBill(e));
    const flexibleItems = entries.filter(
      (e) => !e.isIncome && !isPriorityBill(e) && e.category !== "savings",
    );
    const renewals = entries
      .filter((e) => !e.isIncome && e.category === "bills" && e.contractEndDate)
      .map((e) => ({ ...e, daysUntil: getDaysUntilContractEnd(e.contractEndDate) }))
      .filter((e) => e.daysUntil !== null && e.daysUntil <= 30);
    return {
      priorityCount: priorityItems.length,
      priorityBudget: priorityItems.reduce((s, e) => s + toMonthly(e), 0),
      flexibleBudget: flexibleItems.reduce((s, e) => s + toMonthly(e), 0),
      renewals,
    };
  }, [entries]);

  const incomeSources = entries.filter((e) => e.isIncome).length;
  // Without an income row, income and what is left over are unknown (as on the dashboard and MCP).
  const hasIncome = budget?.hasIncome === true;
  const inDeficit = hasIncome && totals.surplus < 0;

  return (
    <div className={overviewRoot()}>
      <KpiCard
        emptyAction={
          salaryMissing ? (
            <Button asChild size="sm" variant="ghost">
              <SampleAwareLink to="/app/profile">Add your pay details</SampleAwareLink>
            </Button>
          ) : undefined
        }
        label="Safe to spend each week"
        subtext={
          safeToSpend ? (
            <span className={heroSubtext()}>
              <span>About</span>
              <Money size="sm" tone="onContrast" value={safeToSpend.daily} />
              <span>a day after essentials, debt payments and planned savings</span>
            </span>
          ) : salaryMissing ? (
            "Worked out from your take-home pay, which needs your salary details."
          ) : (
            "Worked out once your budget has essential spending."
          )
        }
        tone="hero"
        value={
          safeToSpend ? (
            <span data-figure="safeToSpend.weekly">
              <Money size="kpi" tone="onContrast" value={safeToSpend.weekly} />
            </span>
          ) : null
        }
      />

      <section aria-labelledby="budget-stand-heading" className={section()}>
        <div className={sectionHeader()}>
          <h2 className={sectionTitle()} id="budget-stand-heading">
            Where you stand
          </h2>
          <Button size="sm" variant="outline" onClick={onNavigateToRunway}>
            See your months of cover
          </Button>
        </div>
        <KpiStrip columns={4}>
          <KpiCard
            label="Budgeted income"
            subtext={plural(incomeSources, "source", "sources")}
            value={
              hasIncome ? (
                <span data-figure="budget.income">
                  <Money size="lg" value={totals.income} />
                </span>
              ) : null
            }
          />
          <KpiCard
            label="Monthly spending"
            subtext={`Across ${plural(expenseCategories.length, "category", "categories")}`}
            value={
              <span data-figure="budget.outgoings">
                <Money size="lg" value={totals.expenses} />
              </span>
            }
          />
          <KpiCard
            label="Planned savings"
            subtext="Set aside each month"
            value={
              <span data-figure="budget.savings">
                <Money size="lg" value={totals.budgetedSavings} />
              </span>
            }
          />
          <KpiCard
            delta={
              !hasIncome
                ? undefined
                : inDeficit
                  ? { direction: "down", text: "Spending exceeds income" }
                  : { direction: "up", text: "Left over" }
            }
            label={inDeficit ? "Monthly shortfall" : "Left over each month"}
            value={
              hasIncome ? (
                <span data-figure="budget.surplus" data-figure-sign={inDeficit ? "-1" : "1"}>
                  <Money size="lg" value={Math.abs(totals.surplus)} />
                </span>
              ) : null
            }
          />
        </KpiStrip>
      </section>

      {inDeficit && (
        <div className={noticeCard()} role="note">
          <div className={noticeHeader()}>
            <span className={dangerIcon()}>
              <Icon icon={AlertTriangle} />
            </span>
            <h2 className={noticeTitle()}>Your budget spends more than you bring in</h2>
            <StatusBadge variant="danger">
              <Money size="sm" tone="danger" value={Math.abs(totals.surplus)} /> short each month
            </StatusBadge>
          </div>
          <p className={noticeBody()}>
            Rent or mortgage, council tax and energy are priority bills, so they rank above credit
            cards and personal loans if money runs short.
          </p>
          <CollapsibleDrawer title="Free UK debt support">
            <ul className={helplineList()}>
              <li>
                <a
                  className={helplineLink()}
                  href="https://www.stepchange.org"
                  rel="noreferrer"
                  target="_blank"
                >
                  StepChange (0800 138 1111)
                </a>
              </li>
              <li>
                <a
                  className={helplineLink()}
                  href="https://www.nationaldebtline.org"
                  rel="noreferrer"
                  target="_blank"
                >
                  National Debtline (0808 808 4000)
                </a>
              </li>
              <li>
                <a
                  className={helplineLink()}
                  href="https://www.citizensadvice.org.uk"
                  rel="noreferrer"
                  target="_blank"
                >
                  Citizens Advice
                </a>
              </li>
            </ul>
          </CollapsibleDrawer>
        </div>
      )}

      <section aria-labelledby="budget-split-heading" className={section()}>
        <h2 className={sectionTitle()} id="budget-split-heading">
          Fixed and flexible
        </h2>
        <div className={splitGrid()}>
          <Card padding="lg">
            <div className={splitCard()}>
              <h3 className={splitTitle()}>Priority bills</h3>
              <Money size="lg" value={split.priorityBudget} />
              <p className={splitNote()}>
                {plural(split.priorityCount, "item", "items")} a month: rent or mortgage, council
                tax, energy and water
              </p>
            </div>
          </Card>
          <Card padding="lg">
            <div className={splitCard()}>
              <h3 className={splitTitle()}>Flexible spending</h3>
              <Money size="lg" value={split.flexibleBudget} />
              <p className={splitNote()}>Day-to-day spending, leisure and variable subscriptions</p>
            </div>
          </Card>
        </div>
      </section>

      {split.renewals.length > 0 && (
        <Card padding="lg">
          <section aria-labelledby="budget-renewals-heading" className={section()}>
            <div className={sectionHeader()}>
              <div className={noticeHeader()}>
                <span className={warningIcon()}>
                  <Icon icon={CalendarClock} />
                </span>
                <h2 className={noticeTitle()} id="budget-renewals-heading">
                  Upcoming bill renewals
                </h2>
                <StatusBadge variant="warning">
                  {plural(split.renewals.length, "renewal", "renewals")} within 30 days
                </StatusBadge>
              </div>
              <Button size="sm" variant="outline" onClick={() => onNavigateToCategory("bills")}>
                Open bills
              </Button>
            </div>
            <ul className={renewalList()}>
              {split.renewals.map((bill) => {
                const days = bill.daysUntil ?? 0;
                return (
                  <li key={bill.id} className={renewalRow()}>
                    <span className={renewalName()}>
                      <strong>{bill.name}</strong>
                      <span className={mutedText()}>
                        <Money size="sm" tone="muted" value={toMonthly(bill)} /> a month
                      </span>
                    </span>
                    <StatusBadge variant={days <= 0 ? "danger" : "warning"}>
                      {days <= 0
                        ? days === 0
                          ? "Ends today"
                          : `Ended ${plural(Math.abs(days), "day", "days")} ago`
                        : `Renews in ${plural(days, "day", "days")}`}
                    </StatusBadge>
                  </li>
                );
              })}
            </ul>
          </section>
        </Card>
      )}

      <ExpenseBreakdown
        categories={categoryTotals}
        totalExpenses={totals.expenses}
        onNavigateToCategory={onNavigateToCategory}
      />
    </div>
  );
};
