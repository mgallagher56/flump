import { HeroFigure, KpiCard, KpiStrip } from "@repo/ui";
import type { FC, ReactElement } from "react";
import { formatRate } from "../SavingsForecast/savingsForecast.utils";
import { kpiFigure } from "./SavingsSummaryCards.styles";

export interface SavingsSummaryCardsProps {
  totalSavingsBalance: number;
  accountCount: number;
  /** Total saved each month across the accounts. Null or 0 hides the card. */
  monthlySaving: number | null;
  /** Average AER across the accounts that store a rate. Null or 0 hides the card. */
  averageRate: number | null;
  /** ISA allowance used this tax year. Null or 0 reads "None this tax year". */
  isaUsed: number | null;
  /** True when an account has ISA in its name. False hides the ISA card. */
  hasIsaAccount: boolean;
}

const isReal = (value: number | null): value is number =>
  value !== null && Number.isFinite(value) && value > 0;

export const ISA_NONE = "None";
export const ISA_EXPLAIN =
  "Your saved monthly amount into accounts with ISA in their name, for each month since 6 April. The ISA allowance is £20,000 a year.";

export const KPI_PROMPT_TITLE =
  "Add what you save each month and your interest rates to see more here";

/**
 * The saved facts at the top of the page: the hero "Total savings", then a strip of up to 3 real
 * values. A card without a real value is hidden (P3.3), never shown as £0 or 0%; when none is
 * set, one prompt replaces the strip (P3.2).
 */
export const SavingsSummaryCards: FC<SavingsSummaryCardsProps> = ({
  totalSavingsBalance,
  accountCount,
  monthlySaving,
  averageRate,
  isaUsed,
  hasIsaAccount,
}) => {
  const cards: ReactElement[] = [];
  const single = accountCount === 1;
  if (isReal(monthlySaving)) {
    cards.push(
      <KpiCard
        key="monthly"
        label="Saved each month"
        subtext={single ? "Into your account" : "Across your accounts"}
        value={Math.round(monthlySaving)}
        valueFormat={{ fractionDigits: 0 }}
      />,
    );
  }
  if (isReal(averageRate)) {
    cards.push(
      <KpiCard
        key="rate"
        label={single ? "Rate" : "Average rate"}
        subtext={single ? "AER on your account" : "AER across your accounts"}
        value={<span className={kpiFigure()}>{formatRate(averageRate)}</span>}
      />,
    );
  }
  // Shown only when an account has ISA in its name (round 3): with no ISA a "None" card says
  // nothing new, so the strip holds two. With an ISA and no monthly saving it reads "None".
  if (cards.length > 0 && hasIsaAccount) {
    cards.push(
      <KpiCard
        explain={ISA_EXPLAIN}
        key="isa"
        label="Paid into ISAs this tax year"
        subtext="From what you save each month, since 6 April"
        value={isReal(isaUsed) ? isaUsed : <span className={kpiFigure()}>{ISA_NONE}</span>}
        valueFormat={{ fractionDigits: 0 }}
      />,
    );
  }

  return (
    <>
      <HeroFigure
        label="Total savings"
        subline={`Across ${accountCount === 1 ? "1 savings or investment account" : `${accountCount} savings and investment accounts`}`}
        value={totalSavingsBalance}
        valueFormat={{ fractionDigits: 0 }}
      />
      {cards.length > 0 ? (
        <KpiStrip columns={cards.length as 1 | 2 | 3}>{cards}</KpiStrip>
      ) : (
        <KpiStrip
          emptyPrompt={{
            title: KPI_PROMPT_TITLE,
            description: "Edit an account in the list below to add them.",
            id: "savings-kpi-prompt",
          }}
        >
          <KpiCard label="Saved each month" value={null} />
          <KpiCard label="Average rate" value={null} />
        </KpiStrip>
      )}
    </>
  );
};

export default SavingsSummaryCards;
