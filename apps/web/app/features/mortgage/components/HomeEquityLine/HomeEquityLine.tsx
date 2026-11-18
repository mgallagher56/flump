import { estimateHomeEquity } from "@flump/finance-engine";
import { Money } from "@repo/ui";
import type { FC } from "react";
import { homeEquityLineRecipe } from "./HomeEquityLine.styles";

export interface HomeEquityLineProps {
  /** The home value as typed or saved. Nothing shows until it is above 0. */
  homeValue: number | null | undefined;
  /** The user's share of the home when joint, 1 to 100; `null` when held solely. */
  homeSharePercent?: number | null;
  /** What is still owed on the mortgage, as a positive amount. Missing counts as no mortgage. */
  mortgageBalance?: number | null;
  /** The user's share of the mortgage when joint, 1 to 100; `null` when held solely. */
  mortgageSharePercent?: number | null;
  id?: string;
}

const formatShare = (share: number): string =>
  new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(share);

const shareOf = (share: number | null | undefined): number =>
  typeof share === "number" && Number.isFinite(share) ? share : 100;

/** The share subline: one share when both match, a general line when they differ, none when sole. */
export const equityShareSubline = (
  homeSharePercent: number | null | undefined,
  mortgageSharePercent: number | null | undefined,
  hasMortgage: boolean,
): string | null => {
  const home = shareOf(homeSharePercent);
  const mortgage = hasMortgage ? shareOf(mortgageSharePercent) : home;
  if (home === mortgage) return home < 100 ? `At your ${formatShare(home)}% share` : null;
  return "At your share of the home and of the mortgage";
};

/**
 * "Your equity": the home value less the mortgage, worked out by the finance engine
 * (`estimateHomeEquity`), with the home and the mortgage each at the user's own share. Read-only
 * and neutral: a negative figure shows with a minus sign in the normal text colour, with no
 * warning tone.
 */
export const HomeEquityLine: FC<HomeEquityLineProps> = ({
  homeValue,
  homeSharePercent = null,
  mortgageBalance = null,
  mortgageSharePercent = null,
  id = "home-equity-line",
}) => {
  const equity = estimateHomeEquity({
    homeValue,
    homeSharePercent,
    mortgageBalance,
    mortgageSharePercent,
  });
  if (!equity) return null;
  const classes = homeEquityLineRecipe();
  const hasMortgage = typeof mortgageBalance === "number" && mortgageBalance !== 0;
  const subline = equityShareSubline(homeSharePercent, mortgageSharePercent, hasMortgage);
  return (
    <div className={classes.root} data-testid={id} id={id}>
      <div className={classes.row}>
        <span className={classes.label}>Your equity</span>
        <Money className={classes.value} size="md" value={equity.yours} />
      </div>
      {subline ? <p className={classes.subline}>{subline}</p> : null}
    </div>
  );
};

export default HomeEquityLine;
