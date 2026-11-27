import { type FinancialPicture, selectBudgetOverview } from "@flump/finance-engine";
import { HeroFigure, KpiCard, KpiStrip, VisuallyHidden } from "@repo/ui";
import { type FC, useMemo } from "react";
import { SampleAwareLink } from "~/components/navigation/SampleAwareLink";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import type { BudgetEntry } from "~/types/budget";
import { buildWorkspacePicture } from "~/utils/financialPicture";
import {
  equationBar,
  equationOp,
  equationResult,
  equationTerm,
  figure,
  inlineLink,
  overviewRoot,
} from "./BudgetOverview.styles";

export interface BudgetOverviewProps {
  entries: BudgetEntry[];
  /**
   * The engine's figures for these entries (built by the container with the same function the
   * loaders use). The overview never adds rows up itself (E23 section 2). Saved data only: no
   * scenario input ever reaches these figures.
   */
  picture?: Pick<FinancialPicture, "budget" | "safeToSpend"> &
    Partial<Pick<FinancialPicture, "budgetRows" | "takeHome">>;
}

/**
 * The budget page's first view (E16 R2-6): one headline, "Left over each month", with weekly safe
 * to spend as its sub-line, then 2 supporting figures that explain it: money in (income is not a
 * spending category, so it shows here and nowhere else) and going out. Breathing room is the
 * scenario zone's outcome, so it shows once. 4 figures in all (N1 4). Facts only, in the usual colours: a budget
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
  // The engine's facts: the figures, which prompt applies and which line goes under the headline.
  const facts = selectBudgetOverview(picture);
  const { hasIncome, isShort, goingOut, leavesOut: budgetLeavesOut } = facts;
  const notSetPrompt =
    facts.prompt?.kind === "refused" ? (
      facts.prompt.notice
    ) : facts.prompt?.kind === "takeHomeNotSet" ? (
      <>
        Your take-home pay is not set, so what is left over is unknown.{" "}
        <SampleAwareLink className={inlineLink()} to="/app/profile#settings-age-and-pay">
          Add your salary
        </SampleAwareLink>
      </>
    ) : facts.prompt?.kind === "housingNotSet" ? (
      "Your housing payment is not set, so what is left over is unknown. Add it in your housing details below."
    ) : null;

  const baseSubline =
    facts.subline === null ? undefined : facts.subline === "safeToSpend" ? (
      <>
        {/* Monthly, to match "left over" above; a different measure, so it says what it leaves out
          (owner ruling 2026-11-15). Named first, so it never reads as a second "left over" figure
          (phone audit P23). */}
        Safe to spend before flexible spending:{" "}
        <span className={figure()} data-figure="safeToSpend.monthly">
          {formatCurrency(facts.safeToSpendMonthly ?? 0, { maximumFractionDigits: 0 })}
        </span>{" "}
        a month, after essential spending, debt payments and savings.
      </>
    ) : facts.subline === "addSalary" ? (
      <>
        <SampleAwareLink className={inlineLink()} to="/app/profile#settings-age-and-pay">
          Add your salary
        </SampleAwareLink>{" "}
        to see what you have each month after essential spending.
      </>
    ) : (
      "Add your essential spending to see what you have after it each month."
    );
  // What the left over leaves out (a refused student loan plan in the linked take-home pay),
  // said once, beside the figure it changes.
  const subline =
    budgetLeavesOut && baseSubline ? (
      <>
        {baseSubline} {budgetLeavesOut}
      </>
    ) : (
      (budgetLeavesOut ?? baseSubline)
    );

  return (
    <div className={overviewRoot()}>
      <HeroFigure
        emptyPrompt={notSetPrompt ?? "Add your income to see what is left over each month."}
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
              {formatCurrency(facts.heroFigure ?? 0, { maximumFractionDigits: 0 })}
            </span>
          ) : null
        }
      />
      <KpiStrip
        // One prompt only when both figures are unknown; a known figure is never hidden.
        emptyPrompt={
          facts.supportingUnknown
            ? { title: "Add your income and spending to see money in and going out" }
            : undefined
        }
        items={[
          <KpiCard
            key="income"
            label="Money in each month"
            subtext="After tax"
            value={facts.income}
            valueFormat={{ fractionDigits: 0 }}
          />,
          <KpiCard
            key="out"
            label="Going out each month"
            subtext="Bills, spending and savings"
            value={goingOut}
            valueFormat={{ fractionDigits: 0 }}
          />,
        ]}
      />
      {facts.showsEquation ? (
        <p className={equationBar()} data-testid="budget-equation" id="budget-equation">
          <span className={equationTerm()}>Money in</span>
          <span aria-hidden="true" className={equationOp()}>
            −
          </span>
          <VisuallyHidden> minus </VisuallyHidden>
          <span className={equationTerm()}>Going out</span>
          <span aria-hidden="true" className={equationOp()}>
            =
          </span>
          <VisuallyHidden> equals </VisuallyHidden>
          <span className={equationResult()}>{isShort ? "Short" : "Left over"}</span>
        </p>
      ) : null}
    </div>
  );
};
