/**
 * One tax engine law (E25 T15, E4 B-07). UK tax arithmetic lives in the rule functions of
 * `packages/finance-engine/src/uk-tax-year.ts` (bands, National Insurance, student loans, the
 * allowance taper) and nowhere else. This guard fails when a second implementation appears:
 *
 * 1. A removed implementation comes back, under its old name, anywhere in the repo.
 * 2. A file other than the rules files reads a rate or threshold field of the rules tables. A
 *    file that works a tax figure out for itself has to read them; a file that calls the rule
 *    functions does not. The few existing readers are listed with a reason and a ceiling, so they
 *    cannot grow into a calculator either.
 */

/** Old second implementations. None may be declared or called again. */
export const REMOVED_IMPLEMENTATIONS = [
  "calculateUKEWNITakeHome",
  "calculateUKEWNIIncomeTaxOnTaxable",
  "calculateScottishIncomeTaxOnTaxable",
  "calculateNationalInsurance",
  "calculateUKTakeHome",
  "buildLegacyUKConfig",
] as const;

/**
 * What only tax arithmetic needs: the rate and threshold fields of the rules tables (by any
 * access: `.mainRate`, destructured `mainRate`, `["mainRate"]`), the Scottish band list, and the
 * current thresholds typed as numbers (12,570, 37,700, 50,270, 125,140).
 */
export const RATE_FIELD =
  /\b(?:mainRate|upperRate|primaryThreshold|upperEarningsLimit|lowerProfitsLimit|upperProfitsLimit|basicRateBandWidth|additionalRateThreshold)\b|\.(?:basicRate|higherRate|additionalRate)\b|\bscotland\.bands\b|\b(?:12_?570|37_?700|50_?270|125_?140)\b/g;

/** The rules: the tables and the functions that apply them. No ceiling. */
export const RULES_FILES: readonly string[] = [
  "packages/finance-engine/src/tax-rules.ts",
  "packages/finance-engine/src/uk-tax-year.ts",
];

/**
 * Files that read a rate or threshold without being a second calculator, each with the most
 * reads it may hold. Lower a ceiling when reads are removed; raising one needs a reason here.
 */
export const ALLOWED_READERS: Readonly<Record<string, { max: number; reason: string }>> = {
  "packages/finance-engine/src/uk-tax.ts": {
    max: 21,
    reason:
      "Deprecated UK_TAX_CONSTANTS, the marginal rate label in the tax trap analysis and the Personal Savings Allowance band edge. Totals come from computeUkTakeHome.",
  },
  "packages/finance-engine/src/tax-calculator.ts": {
    max: 7,
    reason:
      "Stacks savings and dividends on top of non-savings income (band edges and dividend rates). Income Tax, the taper and Class 4 come from the rule functions.",
  },
  "packages/finance-engine/src/uk-tax-thresholds.ts": {
    max: 8,
    reason: "Lists the thresholds as labelled points for charts. It computes no tax.",
  },
  "packages/finance-engine/src/section24.ts": {
    max: 1,
    reason:
      "Labels whether other income reaches the higher rate. The tax comes from the rule functions.",
  },
  "apps/web/app/features/pension/forecast.ts": {
    max: 1,
    reason:
      "50,270 here is the upper limit of qualifying earnings for workplace pension contributions, a pension rule, not an Income Tax band.",
  },
  "packages/finance-engine/src/uk-take-home.ts": {
    max: 1,
    reason: "Relief at source gross-up at the basic rate.",
  },
};

export interface OneTaxEngineViolation {
  file: string;
  message: string;
}

const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

/** Checks one source file. `file` is the repo-relative path with forward slashes. */
export function checkFile(file: string, source: string): OneTaxEngineViolation[] {
  const code = stripComments(source);
  const violations: OneTaxEngineViolation[] = [];
  for (const name of REMOVED_IMPLEMENTATIONS) {
    if (new RegExp(`\\b${name}\\b`).test(code)) {
      violations.push({
        file,
        message: `${name} was removed: call the rule functions in uk-tax-year.ts, or computeUkTakeHome`,
      });
    }
  }
  if (RULES_FILES.includes(file)) return violations;
  const reads = code.match(RATE_FIELD)?.length ?? 0;
  const allowed = ALLOWED_READERS[file];
  if (!allowed && reads > 0) {
    violations.push({
      file,
      message: `reads ${reads} tax rate or threshold field(s). Tax arithmetic belongs in packages/finance-engine/src/uk-tax-year.ts: call its rule functions instead`,
    });
  } else if (allowed && reads > allowed.max) {
    violations.push({
      file,
      message: `reads ${reads} tax rate or threshold fields, more than its ceiling of ${allowed.max}. Move the new arithmetic into uk-tax-year.ts`,
    });
  }
  return violations;
}
