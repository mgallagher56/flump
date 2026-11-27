/**
 * The accounts list and account page figures on their own (`@flump/finance-engine/accounts`), for
 * the mobile app (E12 S6). Metro does not drop unused exports, so importing the package root
 * bundles all of it, including the tax vector catalogue. This entry reaches only what the accounts
 * screens need; `accounts-entry.test.ts` keeps the vectors out of it.
 */

export {
  ACCOUNT_TYPE_ORDER,
  type AccountBalance,
  type AccountBalanceAccount,
  type AccountGroups,
  type AccountHeroFigure,
  type AccountMonthRow,
  type AccountSeriesPoint,
  isLeftOutOfNetWorth,
  isOwedAccountType,
  OWED_ACCOUNT_TYPES,
  selectAccountBalance,
  selectAccountBalanceSeries,
  selectAccountChangeEffect,
  selectAccountGroups,
  selectSeriesChange,
  toShownBalance,
} from "./account-balance.js";
export { categorizeAccountType } from "./account-category.js";
export { selectChartFractions } from "./chart-fractions.js";
export {
  type AccountOwnership,
  describeJointShareOfWhole,
  describeJointWholeHistory,
  describeJointWholeValue,
  jointShareLabel,
  resolveAccountOwnership,
  resolveAccountSharePercent,
} from "./joint-share.js";
export {
  type NetWorthLeftOut,
  netWorthChoicesAvailable,
  resolveNetWorthScope,
} from "./net-worth-basis.js";
export {
  type RecordedMonthComparison,
  selectRecordedMonthComparison,
} from "./recorded-month-comparison.js";
export { type AccountDelta, type NetWorthPoint, selectAccountDeltas } from "./snapshots.js";
