/**
 * The Home hero's figures on their own (`@flump/finance-engine/net-worth`), for the mobile app (E12
 * S5). Metro does not drop unused exports, so importing the package root bundles all of it,
 * including the tax vector catalogue. This entry reaches only what the hero and the settings page need;
 * `net-worth-entry.test.ts` keeps the vectors out of it.
 */

export { selectSavedNetWorthSeries } from "./check-in.js";
export {
  joinNetWorthLeftOut,
  type NetWorthBasis,
  type NetWorthChoicesAvailable,
  type NetWorthLeftOut,
  netWorthBasisFromProfile,
  netWorthChoicesAvailable,
} from "./net-worth-basis.js";
export { type NetWorthChange, selectNetWorthChange } from "./net-worth-change.js";
export {
  type NetWorthTrend,
  type NetWorthTrendBar,
  selectNetWorthTrend,
} from "./net-worth-trend.js";
export { type NetWorthTotals, selectNetWorth } from "./picture/selectors/portfolio-totals.js";
export { PortfolioSnapshot } from "./portfolio.js";
