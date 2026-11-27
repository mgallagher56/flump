/**
 * The take-home breakdown with its vector sign-off label (E25-T5). The figures come from the one
 * take-home core (`uk-take-home-core.ts`); this module adds `verification`, the sign-off status of
 * each feature the result rests on, from the signed tax vectors, and counts an unsigned feature
 * in `isUnverifiedEstimate`. Web, the backend and MCP import from here, so they keep the same
 * check from the same vectors (E12 S5b split the core out so the mobile app need not bundle them).
 */

import { getTaxFeatureVerification, type UkTaxFeature } from "./tax-year-verification.js";
import type { UkTaxYear } from "./types.js";
import {
  computeUkTakeHomeCore,
  type UkIncomeScenario,
  type UkTakeHomeCoreBreakdown,
  type UkTakeHomeFeature,
  type UkTakeHomeOptions,
} from "./uk-take-home-core.js";

export * from "./uk-take-home-core.js";

export type UkFeatureVerification = Partial<Record<UkTaxFeature, "verified" | "unverified">>;

export interface UkTakeHomeBreakdown extends Omit<UkTakeHomeCoreBreakdown, "features"> {
  /** Sign-off status of each feature this result uses. */
  verification: UkFeatureVerification;
  /** True when any feature is unsigned, any rule group is unverified or any assumption is. */
  isUnverifiedEstimate: boolean;
}

// The vector catalogues are static, so each (year, feature) status is worked out once. The curve
// calls the core hundreds of times and must not re-scan thousands of vectors each time.
const verificationCache = new Map<string, "verified" | "unverified">();
function featureVerification(
  year: UkTaxYear,
  feature: UkTakeHomeFeature,
): "verified" | "unverified" {
  const key = `${year}|${feature}`;
  let status = verificationCache.get(key);
  if (status === undefined) {
    status = getTaxFeatureVerification(year, feature);
    verificationCache.set(key, status);
  }
  return status;
}

export function computeUkTakeHome(
  s: UkIncomeScenario,
  opts: UkTakeHomeOptions = {},
): UkTakeHomeBreakdown {
  const { features, isUnverifiedEstimate, ...core } = computeUkTakeHomeCore(s, opts);
  const verification: UkFeatureVerification = {};
  for (const f of features) verification[f] = featureVerification(core.ratesYear, f);
  return {
    ...core,
    verification,
    isUnverifiedEstimate:
      isUnverifiedEstimate || Object.values(verification).some((v) => v !== "verified"),
  };
}
