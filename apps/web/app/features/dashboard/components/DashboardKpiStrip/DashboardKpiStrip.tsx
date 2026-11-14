import { Button, KpiCard, KpiStrip, Money } from "@repo/ui";
import type { FC, ReactElement } from "react";
import { SampleAwareLink } from "~/components/navigation/SampleAwareLink";
import { kpiFigure, kpiPromptLink } from "./DashboardKpiStrip.styles";

export interface DashboardKpiStripProps {
  /** `null` for any figure that is unknown. Only a real zero is shown as £0. */
  monthlySurplus: number | null;
  /**
   * The monthly income in the saved budget when the budget holds income but no spending yet (set
   * up straight after onboarding). The first card then shows this income and asks for spending,
   * instead of a "left over" that would only be income minus nothing. `null` otherwise.
   */
  incomeOnly?: number | null;
  /** Total owed on cards, loans and overdrafts; `null` or 0 when there is none. */
  totalOwed: number | null;
  /** Pension pots total, shown in the second card when there is no debt. */
  pensionPot: number | null;
}

/** True when the second card shows the debt total, so the pension card keeps the pot. */
export const stripShowsDebt = (totalOwed: number | null): boolean =>
  totalOwed !== null && totalOwed > 0;

/** How "left over each month" is worked out, for the card's explain tip (copy guide: plain, no judgement). */
/** One plain caption on every card, so the cards read evenly (R2-4). */
export const LEFT_OVER_CAPTION = "From your budget";
export const OWED_CAPTION = "Cards, loans and overdrafts";
export const PENSION_CAPTION = "From your accounts";

export const INCOME_ONLY_LABEL = "Income in your budget";
export const ADD_SPENDING_PROMPT = "Add your spending to see what is left over each month";

export const LEFT_OVER_EXPLAIN =
  "The income in your budget, minus your bills, living costs and what you put aside for savings each month.";

const addLink = (to: string, text: string) => (
  <Button asChild size="sm" variant="ghost">
    <SampleAwareLink to={to}>{text}</SampleAwareLink>
  </Button>
);

/**
 * The dashboard's two supporting figures (E16 P1.5, R2-4 number budget N1 4: the hero, its delta
 * and these two): what is left over each month, and the total owed if there is any debt, otherwise
 * the pension pots. Months of cover belongs to Budget (P6) and net worth is the hero, so neither
 * repeats here. Captions carry no figures. Negative amounts keep the usual colour.
 *
 * With no budget the strip is one prompt. With a budget but no pension or debt, the strip holds the
 * one known figure: a second card reading "Not set" would be half the strip (P3.2).
 */
export const DashboardKpiStrip: FC<DashboardKpiStripProps> = ({
  monthlySurplus,
  incomeOnly = null,
  totalOwed,
  pensionPot,
}) => {
  const short = monthlySurplus !== null && monthlySurplus < 0;
  const showDebt = stripShowsDebt(totalOwed);

  const leftOver =
    incomeOnly !== null ? (
      <KpiCard
        key="income"
        label={INCOME_ONLY_LABEL}
        subtext={
          <SampleAwareLink className={kpiPromptLink()} id="dashboard-add-spending" to="/app/budget">
            {ADD_SPENDING_PROMPT}
          </SampleAwareLink>
        }
        unset={false}
        value={
          <span className={kpiFigure()} data-figure="budget.income">
            <Money fractionDigits={0} size="kpi" value={incomeOnly} />
          </span>
        }
      />
    ) : (
      <KpiCard
        emptyAction={monthlySurplus === null ? addLink("/app/budget", "Add your budget") : null}
        explain={monthlySurplus === null ? undefined : LEFT_OVER_EXPLAIN}
        key="left-over"
        label={short ? "Short each month" : "Left over each month"}
        subtext={monthlySurplus === null ? undefined : LEFT_OVER_CAPTION}
        unset={monthlySurplus === null}
        value={
          monthlySurplus === null ? null : (
            <span className={kpiFigure()} data-figure="budget.surplus">
              <Money fractionDigits={0} size="kpi" value={monthlySurplus} />
            </span>
          )
        }
      />
    );

  const second: ReactElement | null = showDebt ? (
    <KpiCard
      key="owed"
      label="What you owe"
      subtext={OWED_CAPTION}
      unset={false}
      value={
        <span className={kpiFigure()} data-figure="debt.total">
          <Money fractionDigits={0} size="kpi" value={totalOwed} />
        </span>
      }
    />
  ) : pensionPot === null ? null : (
    <KpiCard
      key="pension"
      label="Pension pots"
      subtext={PENSION_CAPTION}
      unset={false}
      value={
        <span className={kpiFigure()}>
          <Money fractionDigits={0} size="kpi" value={pensionPot} />
        </span>
      }
    />
  );

  return (
    <KpiStrip
      emptyPrompt={{
        title: "Add your budget to see what is left over each month",
        action: addLink("/app/budget", "Add your budget"),
        id: "dashboard-kpi-prompt",
      }}
      items={second ? [leftOver, second] : [leftOver]}
    />
  );
};
