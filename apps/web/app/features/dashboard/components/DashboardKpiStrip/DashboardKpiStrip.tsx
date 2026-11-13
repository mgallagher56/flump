import { Button, KpiCard, KpiStrip, Money } from "@repo/ui";
import type { FC } from "react";
import { SampleAwareLink } from "~/components/navigation/SampleAwareLink";
import { kpiSeparator, kpiStack, kpiSubtext } from "./DashboardKpiStrip.styles";

export interface DashboardKpiStripProps {
  /** `null` for any figure that is unknown. Only a real zero is shown as £0. */
  netWorth: number | null;
  totalAssets: number | null;
  totalLiabilities: number | null;
  monthlySurplus: number | null;
  weeklySafeToSpend: number | null;
  liquidCash: number | null;
}

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
  const notSet = (href: string, subject: string) => (
    <Money
      notSetAction={
        <Button asChild size="sm" variant="ghost">
          <SampleAwareLink to={href}>{subject}</SampleAwareLink>
        </Button>
      }
      size="sm"
      value={null}
    />
  );

  return (
    <div className={kpiStack()}>
      {netWorth === null ? null : (
        <KpiCard
          label="Net worth"
          tone="hero"
          subtext={
            <span className={kpiSubtext()}>
              <span>Assets</span>
              <Money size="sm" tone="onContrast" value={totalAssets} />
              <span aria-hidden="true" className={kpiSeparator()}>
                •
              </span>
              <span>Liabilities</span>
              <Money size="sm" tone="onContrast" value={totalLiabilities} />
            </span>
          }
          value={netWorth}
        />
      )}
      <KpiStrip columns={4}>
        <KpiCard
          label="Net worth"
          value={netWorth === null ? notSet("/app/accounts", "Add an account") : netWorth}
        />
        <KpiCard
          label="Monthly surplus"
          subtext={monthlySurplus === null ? undefined : "Available to save, invest or overpay"}
          value={
            monthlySurplus === null ? (
              notSet("/app/budget", "Add your budget")
            ) : (
              <Money size="lg" tone={surplusTone(monthlySurplus)} value={monthlySurplus} />
            )
          }
        />
        <KpiCard
          label="Weekly safe to spend"
          subtext={weeklySafeToSpend === null ? undefined : "Discretionary allowance"}
          value={
            weeklySafeToSpend === null ? (
              notSet("/app/budget", "Add your budget")
            ) : (
              <Money size="lg" value={weeklySafeToSpend} />
            )
          }
        />
        <KpiCard
          label="Liquid cash"
          subtext={liquidCash === null ? undefined : "Savings accounts only"}
          value={
            liquidCash === null ? (
              notSet("/app/savings", "Add a savings account")
            ) : (
              <Money size="lg" value={liquidCash} />
            )
          }
        />
      </KpiStrip>
    </div>
  );
};
