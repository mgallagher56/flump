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
  /** How far commitments and planned savings go past take-home each month; 0 or null if none. */
  safeToSpendShortfall?: number | null;
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
  safeToSpendShortfall = null,
  liquidCash,
}) => {
  const shortfall = safeToSpendShortfall !== null && safeToSpendShortfall > 0;
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
          value={
            netWorth === null ? (
              notSet("/app/accounts", "Add an account")
            ) : (
              <span data-figure="netWorth">
                <Money size="lg" value={netWorth} />
              </span>
            )
          }
        />
        <KpiCard
          label="Monthly surplus"
          subtext={monthlySurplus === null ? undefined : "Available to save, invest or overpay"}
          value={
            monthlySurplus === null ? (
              notSet("/app/budget", "Add your budget")
            ) : (
              <span data-figure="budget.surplus">
                <Money size="lg" tone={surplusTone(monthlySurplus)} value={monthlySurplus} />
              </span>
            )
          }
        />
        <KpiCard
          label="Weekly safe to spend"
          subtext={
            weeklySafeToSpend === null ? undefined : shortfall ? (
              <span>
                Commitments and planned savings are <Money size="sm" value={safeToSpendShortfall} />{" "}
                a month more than take-home
              </span>
            ) : (
              "Discretionary allowance"
            )
          }
          value={
            weeklySafeToSpend === null ? (
              notSet("/app/budget", "Add your budget")
            ) : (
              <span data-figure="safeToSpend.weekly">
                <Money size="lg" value={weeklySafeToSpend} />
              </span>
            )
          }
        />
        <KpiCard
          label="Liquid cash"
          subtext={liquidCash === null ? undefined : "Current and savings accounts"}
          value={
            liquidCash === null ? (
              notSet("/app/savings", "Add a savings account")
            ) : (
              <span data-figure="liquidCash">
                <Money size="lg" value={liquidCash} />
              </span>
            )
          }
        />
      </KpiStrip>
    </div>
  );
};
