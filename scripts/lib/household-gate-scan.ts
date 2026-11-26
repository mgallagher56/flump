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

/**
 * `HOUSEHOLD_ENABLED` followed by `=` or `:` and `true`, quoted or not, any case. Plain string
 * scanning, no regular expression: whitespace and quotes are dropped character by character, then
 * each occurrence of the name is checked for `=true` or `:true` not followed by a word character.
 */
const NAME = "household_enabled";
const DROPPED = new Set(['"', "'", "`"]);
const isWordChar = (c: string | undefined): boolean =>
  c !== undefined && ((c >= "a" && c <= "z") || (c >= "0" && c <= "9") || c === "_");

const flatten = (line: string): string =>
  [...line.toLowerCase()].filter((c) => c.trim() !== "" && !DROPPED.has(c)).join("");

function turnsSwitchOn(line: string): boolean {
  const flat = flatten(line);
  for (let at = flat.indexOf(NAME); at !== -1; at = flat.indexOf(NAME, at + 1)) {
    const rest = at + NAME.length;
    const sign = flat[rest];
    if ((sign === "=" || sign === ":") && flat.startsWith("true", rest + 1)) {
      if (!isWordChar(flat[rest + 5])) return true;
    }
  }
  return false;
}

/** A comment line in shell, env, YAML or TypeScript: describing the switch is not turning it on. */
const isComment = (line: string): boolean => {
  const start = line.trimStart();
  return ["#", "//", "/*", "*"].some((marker) => start.startsWith(marker));
};

/** 1-based line numbers where the switch is turned on. */
export function findHouseholdSwitchOn(source: string): number[] {
  return source
    .split("\n")
    .flatMap((line, i) => (!isComment(line) && turnsSwitchOn(line) ? [i + 1] : []));
}
