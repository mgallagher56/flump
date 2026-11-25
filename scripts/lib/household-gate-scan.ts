/** Pure helpers for scripts/check-household-gate.ts, tested in household-gate-scan.test.ts. */

/** Tests switch households on to prove the gate-on behaviour; everything else is scanned. */
const TEST_FILE = /\.(spec|test)\.[cm]?[jt]sx?$/;
const SCANNED =
  /(^|\/)(\.env[^/]*|Dockerfile[^/]*|Procfile)$|\.(json|ya?ml|toml|sh|[cm]?[jt]sx?|env)$/;

export function isScannedForHouseholdSwitch(file: string): boolean {
  if (TEST_FILE.test(file)) return false;
  if (file.startsWith("scripts/check-household-gate") || file.includes("household-gate-scan")) {
    return false;
  }
  return SCANNED.test(file);
}

/** `HOUSEHOLD_ENABLED` followed by `=` or `:` and `true`, quoted or not, any case. */
const SWITCH_ON = /HOUSEHOLD_ENABLED["']?\s*[:=]\s*["'`]?\s*true\b/i;

/** A comment line in shell, env, YAML or TypeScript: describing the switch is not turning it on. */
const COMMENT = /^\s*(#|\/\/|\/\*|\*)/;

/** 1-based line numbers where the switch is turned on. */
export function findHouseholdSwitchOn(source: string): number[] {
  return source
    .split("\n")
    .flatMap((line, i) => (!COMMENT.test(line) && SWITCH_ON.test(line) ? [i + 1] : []));
}
