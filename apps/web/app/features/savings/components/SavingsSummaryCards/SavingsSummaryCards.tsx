import type { SavingsInterestEstimate } from "@flump/finance-engine";
import { HeroFigure, KpiCard, KpiStrip } from "@repo/ui";
import type { FC, ReactElement } from "react";
import { kpiFigure } from "./SavingsSummaryCards.styles";

export interface SavingsSummaryCardsProps {
  totalSavingsBalance: number;
  accountCount: number;
  /** Total saved each month across the accounts. Null or 0 hides the card. */
  monthlySaving: number | null;
  /**
   * Interest over the next 12 months on cash savings with a rate, before tax, split into ISA and
   * outside an ISA. Null or a total that rounds to £0 hides the card.
   */
  interest: SavingsInterestEstimate | null;
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

export const INTEREST_LABEL = "Interest over the next 12 months";

const pounds = (value: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(Math.round(value));

/**
 * The ISA and other parts as shown, in whole pounds: rounded so the two add up to the pounds on
 * the card (ISA rounded, other = rounded total less the ISA part). A part that rounds to £0 is
 * treated as absent, so the card never says "£0 is from ISAs".
 */
const shownParts = (interest: SavingsInterestEstimate) => {
  const total = Math.round(interest.total);
  const isa = Math.min(Math.max(0, Math.round(interest.isa)), total);
  return { total, isa, other: total - isa };
};

/** Says what the figure is before tax and which part is tax-free (an ISA), never a judgement. */
export const interestSubtext = (interest: SavingsInterestEstimate): string => {
  const shown = shownParts(interest);
  if (shown.isa > 0 && shown.other > 0) {
    return "An estimate, before tax. ISA interest is tax-free.";
  }
  if (shown.isa > 0) return "An estimate. ISA interest is tax-free.";
  return "An estimate, before tax.";
};

export const interestExplain = (interest: SavingsInterestEstimate): string => {
  const parts = [
    "An estimate from each savings account's balance, interest rate and monthly saving, if the rate stays the same.",
    "It assumes each month's saving goes in at the end of the month.",
  ];
  const shown = shownParts(interest);
  if (shown.isa > 0 && shown.other > 0) {
    parts.push(`${pounds(shown.isa)} is from ISAs and ${pounds(shown.other)} from other savings.`);
  }
  parts.push(
    "Interest in an ISA is tax-free. Whether you pay tax on other interest depends on your other income.",
  );
  if (interest.accountsWithoutRate > 0) {
    parts.push("Accounts without an interest rate are not counted.");
  }
  return parts.join(" ");
};

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
  interest,
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
  // Interest in pounds, not a blended rate: ISA interest is tax-free and other interest may not
  // be, so one percentage across both would read as the same return (owner testing, 18 Nov 2026).
  // Hidden when the total rounds to £0, so the card never reads £0.
  if (interest && isReal(interest.total) && Math.round(interest.total) > 0) {
    cards.push(
      <KpiCard
        explain={interestExplain(interest)}
        key="interest"
        label={INTEREST_LABEL}
        subtext={interestSubtext(interest)}
        value={Math.round(interest.total)}
        valueFormat={{ fractionDigits: 0 }}
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
          <KpiCard label={INTEREST_LABEL} value={null} />
        </KpiStrip>
      )}
    </>
  );
};

export default SavingsSummaryCards;
