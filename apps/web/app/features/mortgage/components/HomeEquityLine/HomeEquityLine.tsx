import { estimateHomeEquity } from "@flump/finance-engine";
import { Money } from "@repo/ui";
import type { FC } from "react";
import { homeEquityLineRecipe } from "./HomeEquityLine.styles";

export interface HomeEquityLineProps {
  /** The home value as typed or saved. Nothing shows until it is above 0. */
  homeValue: number | null | undefined;
  /** What is still owed on the mortgage, as a positive amount. Missing counts as no mortgage. */
  mortgageBalance?: number | null;
  /** The user's share when the home is joint, 1 to 100; `null` when held solely. */
  sharePercent?: number | null;
  id?: string;
}

const formatShare = (share: number): string =>
  new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(share);

/**
 * "Your equity": the home value less the mortgage, worked out by the finance engine
 * (`estimateHomeEquity`), at the user's share when joint. Read-only and neutral: a negative figure
 * shows with a minus sign in the normal text colour, with no warning tone.
 */
export const HomeEquityLine: FC<HomeEquityLineProps> = ({
  homeValue,
  mortgageBalance = null,
  sharePercent = null,
  id = "home-equity-line",
}) => {
  const equity = estimateHomeEquity({ homeValue, mortgageBalance, sharePercent });
  if (!equity) return null;
  const classes = homeEquityLineRecipe();
  const isJoint = typeof sharePercent === "number";
  return (
    <div className={classes.root} data-testid={id} id={id}>
      <div className={classes.row}>
        <span className={classes.label}>Your equity</span>
        <Money className={classes.value} size="md" value={equity.yours} />
      </div>
      {isJoint ? (
        <p className={classes.subline}>{`At your ${formatShare(sharePercent)}% share`}</p>
      ) : null}
    </div>
  );
};

export default HomeEquityLine;
