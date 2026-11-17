import { getUkTaxYearRules, resolveUkTaxYear } from "@flump/finance-engine";
import { CollapsibleDrawer, formatMoney } from "@repo/ui";
import { type FC, useMemo } from "react";
import { rulesList } from "./PensionRules.styles";

/** The lump sum allowance (tax-free cash across all pensions). Not in the tax-year registry yet. */
export const UK_LUMP_SUM_ALLOWANCE = 268_275;

export interface PensionRulesProps {
  /** Paid in each year at the saved figures (you, your employer and payments into pots). `null` when unknown. */
  annualPaidIn: number | null;
  /** Saved facts, read only here. They are changed in "Your details". */
  methodSet: boolean;
  isSalarySacrifice: boolean;
  passEmployerNi: boolean;
}

const money = (n: number) => formatMoney(n, { fractionDigits: Number.isInteger(n) ? 0 : 2 }).text;

/**
 * "UK pension rules": one quiet drawer of saved facts and UK rules, one figure per item (E16
 * P1.6). Closed by default, so none of these count in the first view. It holds no projection:
 * those are on the Retirement page (decision RD6).
 */
export const PensionRules: FC<PensionRulesProps> = ({
  annualPaidIn,
  methodSet,
  isSalarySacrifice,
  passEmployerNi,
}) => {
  const rules = useMemo(() => getUkTaxYearRules(resolveUkTaxYear()), []);
  return (
    <CollapsibleDrawer title="UK pension rules" variant="quiet">
      <ul className={rulesList()} data-testid="pension-rules" id="pension-rules">
        {annualPaidIn !== null && (
          <li>At your saved figures, {money(Math.round(annualPaidIn))} a year is paid in.</li>
        )}
        <li>The standard annual allowance is {money(rules.pensionAnnualAllowance)} a year.</li>
        <li>The tax-free lump sum allowance is {money(UK_LUMP_SUM_ALLOWANCE)}.</li>
        <li>The lump sum allowance is fixed here and not updated each tax year.</li>
        <li>The full new State Pension is {money(rules.statePension.fullNewAnnual)} a year.</li>
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

export default PensionRules;
