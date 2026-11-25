/**
 * The check-in's rules on their own (`@flump/finance-engine/check-in`), for the mobile app (E12
 * S3). Metro does not drop unused exports, so importing the package root bundles all of it,
 * including the tax vector catalogue that `tax-year-verification.ts` reads. This entry reaches
 * only what the check-in needs; `check-in-entry.test.ts` keeps the vectors out of it.
 */

export { categorizeAccountType } from "./account-category.js";
export * from "./check-in.js";
export * from "./check-in-day.js";
export {
  countsTowardNetWorth,
  type NetWorthBasis,
  netWorthBasisFromProfile,
} from "./net-worth-basis.js";
export { getUkCalendarDate } from "./uk-tax-year-calendar.js";
