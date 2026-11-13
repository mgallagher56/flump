import { Button, KpiCard, KpiStrip, Money } from "@repo/ui";
import type { FC } from "react";
import { SampleAwareLink } from "~/components/navigation/SampleAwareLink";
import { kpiSeparator, kpiSubtext } from "./DashboardKpiStrip.styles";

export interface DashboardKpiStripProps {
  /** `null` for any figure that is unknown. Only a real zero is shown as £0. */
  netWorth: number | null;
  totalAssets: number | null;
  totalLiabilities: number | null;
  monthlySurplus: number | null;
  weeklySafeToSpend: number | null;
  liquidCash: number | null;
}

const addLink = (to: string, label: string) => (
  <Button asChild size="sm" variant="ghost">
    <SampleAwareLink to={to}>{label}</SampleAwareLink>
  </Button>
);

const surplusTone = (value: number | null) => {
  if (value === null || value === 0) return "default" as const;
  return value > 0 ? ("positive" as const) : ("danger" as const);
};

/** The four top-level dashboard figures in one row. */
export const DashboardKpiStrip: FC<DashboardKpiStripProps> = ({
  netWorth,
  totalAssets,
  totalLiabilities,
  monthlySurplus,
  weeklySafeToSpend,
  liquidCash,
}) => {
  const addAccount = addLink("/app/accounts", "Add an account");
  const addBudget = addLink("/app/budget", "Add your budget");

  return (
    <KpiStrip columns={4}>
      <KpiCard
        emptyAction={addAccount}
        label="Net worth"
        subtext={
          netWorth === null ? undefined : (
            <span className={kpiSubtext()}>
              <span>Assets</span>
              <Money size="sm" value={totalAssets} />
              <span aria-hidden="true" className={kpiSeparator()}>
                •
              </span>
              <span>Liabilities</span>
              <Money size="sm" value={totalLiabilities} />
            </span>
          )
        }
        value={netWorth === null ? null : <Money size="lg" value={netWorth} />}
      />
      <KpiCard
        emptyAction={addBudget}
        label="Monthly surplus"
        subtext={monthlySurplus === null ? undefined : "Available to save, invest or overpay"}
        value={
          monthlySurplus === null ? null : (
            <Money size="lg" tone={surplusTone(monthlySurplus)} value={monthlySurplus} />
          )
        }
      />
      <KpiCard
        emptyAction={addBudget}
        label="Weekly safe to spend"
        subtext={weeklySafeToSpend === null ? undefined : "Discretionary allowance"}
        value={weeklySafeToSpend === null ? null : <Money size="lg" value={weeklySafeToSpend} />}
      />
      <KpiCard
        emptyAction={addLink("/app/savings", "Add a savings account")}
        label="Liquid cash"
        subtext={liquidCash === null ? undefined : "Savings accounts only"}
        value={liquidCash === null ? null : <Money size="lg" value={liquidCash} />}
      />
    </KpiStrip>
  );
};
