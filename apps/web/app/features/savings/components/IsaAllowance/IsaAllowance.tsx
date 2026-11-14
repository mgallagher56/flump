import { Card, Money, ProgressBar } from "@repo/ui";
import type { FC } from "react";
import { isaNote, isaRoot, isaTitle } from "./IsaAllowance.styles";
import { ISA_ALLOWANCE } from "./isaAllowance.utils";

export interface IsaAllowanceProps {
  /** Allowance used this tax year (shown once on the page, in the KPI strip). */
  used: number;
  limit?: number;
}

const pounds = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

/**
 * The ISA allowance on its owner page (plan P6): one bar and 2 figures, what is unused and the
 * yearly limit. The amount used is the KPI above, so it is not printed again here.
 */
export const IsaAllowance: FC<IsaAllowanceProps> = ({ used, limit = ISA_ALLOWANCE }) => {
  const safeUsed = Math.max(0, Math.min(used, limit));
  const unused = limit - safeUsed;
  return (
    <Card
      aria-labelledby="isa-allowance-heading"
      as="section"
      className={isaRoot()}
      data-testid="isa-allowance"
      elevation="resting"
      id="isa-allowance"
      padding="lg"
    >
      <h2 className={isaTitle()} id="isa-allowance-heading">
        ISA allowance
      </h2>
      <ProgressBar
        label="Estimated use this tax year"
        max={limit}
        value={safeUsed}
        valueDisplay={
          <>
            <Money size="sm" value={unused} /> unused
          </>
        }
        valueText={`Estimate: ${pounds.format(safeUsed)} used, ${pounds.format(unused)} unused`}
      />
      <p className={isaNote()}>
        The allowance is <Money size="sm" value={limit} /> a tax year and resets on 6 April.
      </p>
    </Card>
  );
};

export default IsaAllowance;
