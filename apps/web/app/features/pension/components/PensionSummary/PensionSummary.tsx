import { HeroFigure, KpiCard, KpiStrip, StatusBadge } from "@repo/ui";
import type { FC, ReactNode } from "react";
import { Link } from "react-router";
import { figureText, promptLink } from "./PensionSummary.styles";

export interface PensionSummaryProps {
  /** Saved total across every pot. */
  totalValue: number;
  potsCount: number;
  /** Saved estimate of monthly income at retirement, in today's money. `null` when unknown. */
  estimatedMonthlyIncome: number | null;
  /** What to add before the estimate can be worked out, for example "Add your year of birth". */
  estimateMissing?: { label: string; to: string };
  /** You plus your employer (and any fixed pot payments) each month. `null` when unknown. */
  monthlyTotal: number | null;
  /** True when fixed payments into pots are part of `monthlyTotal`. */
  includesPotPayments?: boolean;
  /** True when the contribution rates are the backend defaults, which the user may not have chosen. */
  ratesAssumed?: boolean;
  /** The age the estimate runs to (the State Pension age). `null` when the user's age is unknown. */
  retirementAge: number | null;
  /** Opens the add-pot dialog, shown in the hero when there are no pots. */
  onAddPot: () => void;
}

const PROFILE_PATH = "/app/profile";
const ASSUMED_RATES_CAPTION = "Assumed rates. Edit to match your payslip";

const promptTo = (label: string, to: string): ReactNode => (
  <Link className={promptLink} to={to}>
    {label}
  </Link>
);

/**
 * Saved figures only (E16 PR 7, ruling D2): the hero is the saved "Total in your pots", never an
 * estimate. The estimated income is the first KPI, tagged "Estimate". Captions carry no figures.
 */
export const PensionSummary: FC<PensionSummaryProps> = ({
  totalValue,
  potsCount,
  estimatedMonthlyIncome,
  estimateMissing,
  monthlyTotal,
  includesPotPayments = false,
  ratesAssumed = false,
  retirementAge,
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
        emptyPrompt={{
          title: "Add your year of birth and salary to see your estimated income at retirement",
          action: promptTo("Update your details", PROFILE_PATH),
        }}
        items={[
          <KpiCard
            action={
              <StatusBadge size="sm" variant="neutral">
                Estimate
              </StatusBadge>
            }
            emptyAction={
              estimateMissing ? promptTo(estimateMissing.label, estimateMissing.to) : undefined
            }
            key="estimate"
            label="Estimated income at retirement"
            subtext={
              estimatedMonthlyIncome === null
                ? undefined
                : ratesAssumed
                  ? "A month, in today's money, on assumed rates"
                  : "A month, in today's money"
            }
            value={estimatedMonthlyIncome}
            valueFormat={{ fractionDigits: 0 }}
          />,
          <KpiCard
            emptyAction={promptTo("Add your salary", PROFILE_PATH)}
            key="monthly"
            label="Going in each month"
            subtext={
              monthlyTotal === null
                ? undefined
                : ratesAssumed
                  ? ASSUMED_RATES_CAPTION
                  : includesPotPayments
                    ? "You, your employer and payments into your pots"
                    : "You and your employer"
            }
            value={monthlyTotal}
            valueFormat={{ fractionDigits: 0 }}
          />,
          <KpiCard
            emptyAction={promptTo("Add your year of birth", PROFILE_PATH)}
            key="age"
            label="Retirement age"
            subtext={retirementAge === null ? undefined : "Your State Pension age"}
            unset={retirementAge === null}
            value={
              retirementAge === null ? null : <span className={figureText}>{retirementAge}</span>
            }
          />,
        ]}
      />
    </>
  );
};

export default PensionSummary;
