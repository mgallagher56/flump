import { Button, KpiCard, KpiStrip, Money } from "@repo/ui";
import type { FC } from "react";
import { SampleAwareLink } from "~/components/navigation/SampleAwareLink";
import { formatMonthsOfCover } from "../BudgetWidget";
import { kpiFigure } from "./DashboardKpiStrip.styles";

export interface DashboardKpiStripProps {
  /** `null` for any figure that is unknown. Only a real zero is shown as £0. */
  monthlySurplus: number | null;
  monthsOfCover: number | null;
  /** Total owed on cards, loans and overdrafts; `null` or 0 when there is none. */
  totalOwed: number | null;
  /** Pension pots total, shown in the third card when there is no debt. */
  pensionPot: number | null;
  /** Whether a budget exists (months of cover then only needs accounts). */
  budgetKnown: boolean;
}

/** True when the third card shows the debt total, so the pension card keeps the pot. */
export const stripShowsDebt = (totalOwed: number | null): boolean =>
  totalOwed !== null && totalOwed > 0;

const addLink = (to: string, text: string) => (
  <Button asChild size="sm" variant="ghost">
    <SampleAwareLink to={to}>{text}</SampleAwareLink>
  </Button>
);

/**
 * The dashboard's three supporting figures (E16 P1.5): what is left over each month, months of
 * cover, and the total owed if there is any debt, otherwise the pension pots. Net worth is the hero
 * and never repeats here. Captions carry no figures. Negative amounts keep the usual colour.
 */
export const DashboardKpiStrip: FC<DashboardKpiStripProps> = ({
  monthlySurplus,
  monthsOfCover,
  totalOwed,
  pensionPot,
  budgetKnown,
}) => {
  const short = monthlySurplus !== null && monthlySurplus < 0;
  const showDebt = stripShowsDebt(totalOwed);

  return (
    <KpiStrip
      emptyPrompt={{
        title: "Add your budget to see what is left over each month and your months of cover",
        action: addLink("/app/budget", "Add your budget"),
        id: "dashboard-kpi-prompt",
      }}
      items={[
        <KpiCard
          emptyAction={monthlySurplus === null ? addLink("/app/budget", "Add your budget") : null}
          key="left-over"
          label={short ? "Short each month" : "Left over each month"}
          unset={monthlySurplus === null}
          value={
            monthlySurplus === null ? null : (
              <span className={kpiFigure()} data-figure="budget.surplus">
                <Money fractionDigits={0} size="kpi" value={monthlySurplus} />
              </span>
            )
          }
        />,
        <KpiCard
          emptyAction={
            monthsOfCover === null
              ? budgetKnown
                ? addLink("/app/accounts", "Add your accounts")
                : addLink("/app/budget", "Add your budget")
              : null
          }
          key="cover"
          label="Months of cover"
          unset={monthsOfCover === null}
          value={
            monthsOfCover === null ? null : (
              <span className={kpiFigure()} data-figure="monthsOfCover">
                {formatMonthsOfCover(monthsOfCover)}
              </span>
            )
          }
        />,
        showDebt ? (
          <KpiCard
            key="owed"
            label="What you owe"
            subtext="Cards, loans and overdrafts"
            unset={false}
            value={
              <span className={kpiFigure()} data-figure="debt.total">
                <Money fractionDigits={0} size="kpi" value={totalOwed} />
              </span>
            }
          />
        ) : (
          <KpiCard
            emptyAction={pensionPot === null ? addLink("/app/accounts", "Add a pension") : null}
            key="pension"
            label="Pension pots"
            unset={pensionPot === null}
            value={
              pensionPot === null ? null : (
                <span className={kpiFigure()}>
                  <Money fractionDigits={0} size="kpi" value={pensionPot} />
                </span>
              )
            }
          />
        ),
      ]}
    />
  );
};
