/**
 * Owner sign-off status of a UK tax year's rules (E17-N5, D4-B). Built on `yearVerification`.
 * E25-T8 appends `getTaxFeatureVerification(year, feature)` to this file.
 */
import { yearVerification } from "./test-vectors/signoff.js";
import { UK_TAX_VECTORS } from "./test-vectors/uk-tax.vectors.js";

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
