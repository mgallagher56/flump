import { CollapsibleDrawer } from "@repo/ui";
import type { FC } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import {
  INFLATION_RATE,
  SAFE_WITHDRAWAL_RATE,
  UK_ANNUAL_ALLOWANCE,
  UK_LUMP_SUM_ALLOWANCE,
} from "../../forecast";
import { assumptionsList } from "./ForecastAssumptions.styles";

export interface ForecastAssumptionsProps {
  /** Employer contributions plus growth by retirement, at the saved figures. `null` when unknown. */
  employerAndGrowth: number | null;
  /** Investment growth by retirement, at the saved figures. `null` when unknown. */
  totalGrowth: number | null;
  /** Paid in each year at the saved figures. */
  annualPaidIn: number;
  /** The full new State Pension a year, from the tax-year registry. */
  statePensionAnnual: number;
  /** True when no pot has a growth rate, so the illustration starts from an assumed rate. */
  growthRateIsPlaceholder: boolean;
  /** The rate assumed when no pot has one. */
  placeholderGrowthRate: number;
  /** Saved facts, read only here. They are changed in "Your details". */
  methodSet: boolean;
  isSalarySacrifice: boolean;
  passEmployerNi: boolean;
}

const pct = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });

/**
 * "Assumptions and UK rules": one quiet drawer holding the assumptions as a short list, one figure
 * per item (E16 P1.6). Closed by default, so none of these count in the first view.
 */
export const ForecastAssumptions: FC<ForecastAssumptionsProps> = ({
  employerAndGrowth,
  totalGrowth,
  annualPaidIn,
  statePensionAnnual,
  growthRateIsPlaceholder,
  placeholderGrowthRate,
  methodSet,
  isSalarySacrifice,
  passEmployerNi,
}) => {
  const { formatCurrency } = useFormatCurrency();
  return (
    <CollapsibleDrawer title="Assumptions and UK rules" variant="quiet">
      <ul className={assumptionsList()} data-testid="pension-assumptions" id="pension-assumptions">
        <li>Estimates use your saved figures, or the inputs above while you change them.</li>
        {growthRateIsPlaceholder && (
          <li>
            No growth rate is set on your pots, so this estimate assumes{" "}
            {pct.format(placeholderGrowthRate)}% a year. Edit a pot to set its rate.
          </li>
        )}
        <li>
          Income is before tax and assumes {SAFE_WITHDRAWAL_RATE * 100}% of the pot is taken each
          year.
        </li>
        <li>In today&apos;s money takes off {INFLATION_RATE}% a year for inflation.</li>
        {employerAndGrowth !== null && (
          <li>
            Your employer and investment growth add an estimated {formatCurrency(employerAndGrowth)}{" "}
            by retirement.
          </li>
        )}
        {totalGrowth !== null && (
          <li>Investment growth is an estimated {formatCurrency(totalGrowth)} of that.</li>
        )}
        <li>At your saved figures, {formatCurrency(annualPaidIn)} a year is paid in.</li>
        <li>The standard annual allowance is {formatCurrency(UK_ANNUAL_ALLOWANCE)} a year.</li>
        <li>The tax-free lump sum allowance is {formatCurrency(UK_LUMP_SUM_ALLOWANCE)}.</li>
        <li>These allowances are fixed here and not updated each tax year.</li>
        <li>
          The full new State Pension is {formatCurrency(statePensionAnnual)} a year. It is added
          only when you include it.
        </li>
        <li>
          The auto-enrolment minimum is 8% of the pay that counts for your pension. At least 3% of
          that comes from your employer.
        </li>
        <li>
          {!methodSet
            ? "Contribution method: not set in your details."
            : isSalarySacrifice
              ? passEmployerNi
                ? "Paid by salary sacrifice, and your employer adds its National Insurance, from your details."
                : "Paid by salary sacrifice, from your details."
              : "Not paid by salary sacrifice, from your details."}
        </li>
      </ul>
    </CollapsibleDrawer>
  );
};

export default ForecastAssumptions;
