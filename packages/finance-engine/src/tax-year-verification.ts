/**
 * Owner sign-off status of a UK tax year's rules (E17-N5, D4-B). Built on `yearVerification`.
 * E25-T8 appends `getTaxFeatureVerification(year, feature)` to this file.
 */
import { type SignableVector, yearVerification } from "./test-vectors/signoff.js";
import { UK_TAX_VECTORS } from "./test-vectors/uk-tax.vectors.js";
import { selectUkWhatIfVectors, type UkTaxFeature } from "./test-vectors/uk-whatif.vectors.js";

export type { UkTaxFeature };
export { yearVerification };

export type TaxVerification = { status: "verified" | "unverified"; detail: string };

export function getTaxYearVerification(year: string): TaxVerification {
  const status = yearVerification(year, UK_TAX_VECTORS);
  return status === "verified"
    ? {
        status,
        detail: `The signed-off test vectors for ${year} all pass owner sign-off. Feature-level verification is not reported yet.`,
      }
    : {
        status,
        detail: `${year} tax rules are not yet fully signed off by the owner. Treat figures as an estimate and check them against HMRC.`,
      };
}

/** Vectors that decide a feature's status: `core` is the original catalogue, the rest are E25's. */
function vectorsForFeature(feature: UkTaxFeature): readonly SignableVector[] {
  return feature === "core" ? UK_TAX_VECTORS : selectUkWhatIfVectors({ feature });
}

/**
 * Sign-off status of one feature in one tax year (E25-T8, DECISIONS round 4 addendum D1 (b)).
 * A feature is "verified" only when it has vectors for the year and the owner has signed every one.
 * Features are independent, so adding E25 vectors never un-signs a year whose `core` vectors are signed.
 */
export function getTaxFeatureVerification(
  year: string,
  feature: UkTaxFeature,
): TaxVerification["status"] {
  return yearVerification(year, vectorsForFeature(feature));
}
