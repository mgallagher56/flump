import { HeroFigure, KpiCard, KpiStrip } from "@repo/ui";
import type { FC, ReactNode } from "react";
import { Link } from "react-router";
import { promptLink } from "./PensionSummary.styles";

export interface PensionSummaryProps {
  /** Saved total across every pot. */
  totalValue: number;
  potsCount: number;
  /** You plus your employer (and any fixed pot payments) each month. `null` when unknown. */
  monthlyTotal: number | null;
  /** True when fixed payments into pots are part of `monthlyTotal`. */
  includesPotPayments?: boolean;
  /**
   * True when a contribution rate has not been set (owner decision 3). The monthly total is then
   * unknown, and the prompt asks for the rates rather than the salary.
   */
  ratesNotSet?: boolean;
  /** Opens the add-pot dialog, shown in the hero when there are no pots. */
  onAddPot: () => void;
}

const PROFILE_PATH = "/app/profile#settings-age-and-pay";
/** The page's own "Your details" section, whose drawer opens on this hash. */
const PENSION_DETAILS_PATH = "/app/pension#pension-details";

const promptTo = (label: string, to: string): ReactNode => (
  <Link className={promptLink} to={to}>
    {label}
  </Link>
);

/**
 * Saved figures only (E16 PR 7, ruling D2): the hero is the saved "Total in your pots" and the one
 * KPI is what goes in each month. Projections (income at retirement) are on the Retirement page
 * (decision RD6). Captions carry no figures.
 */
export const PensionSummary: FC<PensionSummaryProps> = ({
  totalValue,
  potsCount,
  monthlyTotal,
  includesPotPayments = false,
  ratesNotSet = false,
  onAddPot,
}) => {
  const hasPots = potsCount > 0;
  return (
    <>
      <HeroFigure
        emptyAction={
          <button className={promptLink} type="button" onClick={onAddPot}>
            Add pension pot
          </button>
        }
        emptyPrompt="Add a pension pot to see its value."
        label="Total in your pots"
        subline={`In ${potsCount} ${potsCount === 1 ? "pension pot" : "pension pots"}`}
        value={hasPots ? totalValue : null}
        valueFormat={{ fractionDigits: 0 }}
      />
      <KpiStrip
        emptyPrompt={
          ratesNotSet
            ? {
                title: "Add your contribution rates to see what goes in each month",
                action: promptTo("Add your rates", PENSION_DETAILS_PATH),
              }
            : {
                title: "Add your salary to see what goes in each month",
                action: promptTo("Update your details", PROFILE_PATH),
              }
        }
        items={[
          <KpiCard
            emptyAction={
              ratesNotSet
                ? promptTo("Add your rates", PENSION_DETAILS_PATH)
                : promptTo("Add your salary", PROFILE_PATH)
            }
            key="monthly"
            label="Going in each month"
            subtext={
              monthlyTotal === null
                ? undefined
                : includesPotPayments
                  ? "You, your employer and payments into your pots"
                  : "You and your employer"
            }
            value={monthlyTotal}
            valueFormat={{ fractionDigits: 0 }}
          />,
        ]}
      />
    </>
  );
};
