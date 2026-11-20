/**
 * Owner sign-off status of a UK tax year's rules (E17-N5, D4-B). Built on `yearVerification`.
 * E25-T8 appends `getTaxFeatureVerification(year, feature)` to this file.
 */
import { type SignableVector, yearVerification } from "./test-vectors/signoff.js";
import { UK_SELF_ASSESSMENT_VECTORS } from "./test-vectors/uk-self-assessment.vectors.js";
import { UK_TAX_VECTORS } from "./test-vectors/uk-tax.vectors.js";
import { selectUkWhatIfVectors, type UkTaxFeature } from "./test-vectors/uk-whatif.vectors.js";
import { PROVISIONAL_UK_TAX_YEARS } from "./types.js";

export type { UkTaxFeature };
export { yearVerification };

export type TaxVerification = { status: "verified" | "unverified"; detail: string };

/**
 * The one rule (ruling B, 20 Nov 2026): a provisional year's rates are announced, not yet law, so
 * it never reports "verified", however many of its vectors are signed. The marker is
 * PROVISIONAL_UK_TAX_YEARS, the one the tax-year calendar check reads, so removing a year from it
 * at Royal Assent flips this with no second edit. `provisionalYears` is for tests.
 */
function signoffStatus(
  year: string,
  vectors: readonly SignableVector[],
  provisionalYears: readonly string[],
): TaxVerification["status"] {
  return provisionalYears.includes(year) ? "unverified" : yearVerification(year, vectors);
}

export function getTaxYearVerification(
  year: string,
  provisionalYears: readonly string[] = PROVISIONAL_UK_TAX_YEARS,
): TaxVerification {
  // The year is verified only when the Self Assessment vectors are signed too.
  const vectors = [...UK_TAX_VECTORS, ...UK_SELF_ASSESSMENT_VECTORS];
  const status = signoffStatus(year, vectors, provisionalYears);
  const allSigned = yearVerification(year, vectors) === "verified";
  if (status === "unverified" && allSigned) {
    // Signed but held back: only a provisional year gets here.
    return {
      status,
      detail: `${year} figures use rates that are announced but not yet law. They have been checked against the announced rates. Treat them as an estimate.`,
    };
  }
  if (status === "unverified" && provisionalYears.includes(year)) {
    return {
      status,
      detail: `${year} figures use rates that are announced but not yet law. Treat them as an estimate and check them against HMRC.`,
    };
  }
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
function vectorsForFeature(
  feature: UkTaxFeature,
  catalogues: TaxVectorCatalogues,
): readonly SignableVector[] {
  return feature === "core"
    ? catalogues.core
    : selectUkWhatIfVectors({ feature }, catalogues.whatIf);
}

/** The vector catalogues a status is read from. Tests pass fixtures; callers use the defaults. */
export interface TaxVectorCatalogues {
  core: readonly SignableVector[];
  whatIf: Parameters<typeof selectUkWhatIfVectors>[1];
}

const DEFAULT_CATALOGUES: TaxVectorCatalogues = { core: UK_TAX_VECTORS, whatIf: undefined };

/**
 * Sign-off status of one feature in one tax year (E25-T8, DECISIONS round 4 addendum D1 (b)).
 * A feature is "verified" only when it has vectors for the year and the owner has signed every one.
 * Features are independent, so adding E25 vectors never un-signs a year whose `core` vectors are signed.
 */
export function getTaxFeatureVerification(
  year: string,
  feature: UkTaxFeature,
  catalogues: TaxVectorCatalogues = DEFAULT_CATALOGUES,
  provisionalYears: readonly string[] = PROVISIONAL_UK_TAX_YEARS,
): TaxVerification["status"] {
  return signoffStatus(year, vectorsForFeature(feature, catalogues), provisionalYears);
}
