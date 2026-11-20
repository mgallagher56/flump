/**
 * Sign-off status of a UK tax year's rules (E17-N5, D4-B). Built on `yearVerification`. Since
 * 20 Nov 2026 vectors are signed on a Fable decider decision (DECISIONS); older ones by the owner.
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

/** The catalogues a year's status and wording are read from. Tests pass fixtures. */
export interface TaxYearCatalogues {
  core: readonly SignableVector[];
  selfAssessment: readonly SignableVector[];
  whatIf: readonly SignableVector[];
}

export function getTaxYearVerification(
  year: string,
  provisionalYears: readonly string[] = PROVISIONAL_UK_TAX_YEARS,
  catalogues: TaxYearCatalogues = {
    core: UK_TAX_VECTORS,
    selfAssessment: UK_SELF_ASSESSMENT_VECTORS,
    whatIf: selectUkWhatIfVectors(),
  },
): TaxVerification {
  // The year is verified only when the Self Assessment vectors are signed too.
  const vectors = [...catalogues.core, ...catalogues.selfAssessment];
  const status = signoffStatus(year, vectors, provisionalYears);
  if (provisionalYears.includes(year)) {
    // Wording only (signoffStatus decides the status). "Checked" is said only when every vector
    // for the year is signed, the what-if ones (HICBC, relief at source) included, since the
    // figures shown beside this detail include them.
    const everyVectorSigned =
      yearVerification(year, [...vectors, ...catalogues.whatIf]) === "verified";
    return {
      status,
      detail: everyVectorSigned
        ? `${year} figures use rates that are announced but not yet law. They have been checked against the announced rates. Treat them as an estimate.`
        : `${year} figures use rates that are announced but not yet law. Treat them as an estimate and check them against HMRC.`,
    };
  }
  // Wording says what is true: the year's test cases are checked against the published rates. It
  // never suggests that a person or an accountant checked the figures.
  return status === "verified"
    ? {
        status,
        detail: `${year} figures have been checked against the published rates. Checks of separate features, such as the Child Benefit charge, are not reported here.`,
      }
    : {
        status,
        detail: `${year} figures have not yet all been checked against the published rates. Treat them as an estimate and check them against HMRC.`,
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
 * A feature is "verified" only when it has vectors for the year and every one is validly signed.
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
