import { type FinancialPicture, isFigureKnown } from "@flump/finance-engine";
import { HeroFigure, KpiCard, KpiStrip } from "@repo/ui";
import { type FC, useMemo } from "react";
import { SampleAwareLink } from "~/components/navigation/SampleAwareLink";
import { formatMonthsOfCover } from "~/features/dashboard/components/BudgetWidget";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import type { BudgetEntry } from "~/types/budget";
import { buildWorkspacePicture } from "~/utils/financialPicture";
import { figure, inlineLink, overviewRoot } from "./BudgetOverview.styles";

export interface BudgetOverviewProps {
  entries: BudgetEntry[];
  /**
   * The engine's figures for these entries (built by the container with the same function the
   * loaders use). The overview never adds rows up itself (E23 section 2). Saved data only: no
   * scenario input ever reaches these figures.
   */
  picture?: Pick<FinancialPicture, "budget" | "safeToSpend" | "monthsOfCover">;
}

/**
 * The budget page's first view (E16 R2-6): one headline, "Left over each month", with weekly safe
 * to spend as its sub-line, then 2 supporting figures: money in (income is not a spending
 * category, so it shows here and nowhere else) and the saved months of cover, which the scenario
 * zone below starts from. 4 figures in all (N1 4). Facts only, in the usual colours: a budget
 * that is short each month says so plainly, with no alarm styling and no list of services.
 */
export const BudgetOverview: FC<BudgetOverviewProps> = ({ entries, picture: pictureProp }) => {
  const { formatCurrency } = useFormatCurrency();
  // Without a picture from the container, the same engine builder runs on the entries alone
  // (no profile, so safe to spend shows its prompt rather than a guess).
  const picture = useMemo(
    () => pictureProp ?? buildWorkspacePicture({ budgetEntries: entries }),
    [pictureProp, entries],
  );
  const budget = isFigureKnown(picture.budget) ? picture.budget.value : null;
  const cover = isFigureKnown(picture.monthsOfCover) ? picture.monthsOfCover.value : null;
  const safeToSpend = isFigureKnown(picture.safeToSpend) ? picture.safeToSpend.value : null;
  const salaryMissing =
    !isFigureKnown(picture.safeToSpend) &&
    picture.safeToSpend.missing.some((key) => !key.startsWith("budget"));

  // Without an income row, income and what is left over are unknown (as on the dashboard and MCP).
  const hasIncome = budget?.hasIncome === true;
  const surplus = budget?.surplus ?? 0;
  const isShort = hasIncome && surplus < 0;

  const subline = safeToSpend ? (
    <>
      <span className={figure()} data-figure="safeToSpend.weekly">
        {formatCurrency(safeToSpend.weekly, { maximumFractionDigits: 0 })}
      </span>{" "}
      a week is safe to spend after essential spending, debt payments and planned savings.
    </>
  ) : salaryMissing ? (
    <>
      <SampleAwareLink className={inlineLink()} to="/app/profile">
        Add your salary
      </SampleAwareLink>{" "}
      to see what is safe to spend each week.
    </>
  ) : (
    "Safe to spend each week shows once your budget has essential spending."
  );

  return (
    <div className={overviewRoot()}>
      <HeroFigure
        emptyPrompt="Add your income to see what is left over each month."
        explain="Money in each month, minus your bills, spending and savings in your budget."
        label={isShort ? "Short each month" : "Left over each month"}
        subline={subline}
        value={
          hasIncome ? (
            <span
              className={figure()}
              data-figure="budget.surplus"
              data-figure-sign={isShort ? "-1" : "1"}
            >
              {formatCurrency(Math.abs(surplus), { maximumFractionDigits: 0 })}
            </span>
          ) : null
        }
      />
      <KpiStrip
        // One prompt only when both figures are unknown; a known figure is never hidden.
        emptyPrompt={
          !hasIncome && !cover
            ? {
                title: "Add your income and essential spending to see money in and months of cover",
              }
            : undefined
        }
        items={[
          <KpiCard
            key="income"
            label="Money in each month"
            value={hasIncome ? (budget?.income ?? 0) : null}
            valueFormat={{ fractionDigits: 0 }}
          />,
          <KpiCard
            explain="An estimate of how long your current and savings accounts would last if your income stopped, covering essential spending and minimum debt payments."
            key="cover"
            label="Months of cover"
            value={
              cover ? (
                <span className={figure()} data-figure="monthsOfCover">
                  {formatMonthsOfCover(cover.months)}
                </span>
              ) : null
            }
          />,
        ]}
      />
    </div>
  );
};
