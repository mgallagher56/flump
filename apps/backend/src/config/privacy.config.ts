type Raw = Record<string, string | undefined>;

/**
 * Variables the backend no longer reads but still accepts, so a value left in Railway does not fail
 * boot. Each one that is set is logged once at boot and counted in `/health/ready`
 * `configWarnings`, so the owner knows to delete it.
 *
 * - `TERMS_VERSION`: retired by terms acceptance. The versions people agree to now come from
 *   `LEGAL_PAGES` (`@flump/business-details`), which change with the pages' wording.
 */
const RETIRED_VARIABLES = ["TERMS_VERSION"] as const;
export type RetiredVariable = (typeof RETIRED_VARIABLES)[number];

/** The retired variables that are set (not blank), in a fixed order. Any environment. */
export function retiredVariablesSet(env: Raw): RetiredVariable[] {
  return RETIRED_VARIABLES.filter((name) => (env[name]?.trim() ?? "") !== "");
}

/** The boot log line for one retired variable. Names the variable, never its value. */
export function retiredVariableMessage(name: RetiredVariable): string {
  return `${name} is set but no longer used. Terms versions come from LEGAL_PAGES in packages/business-details. Delete ${name} from the environment.`;
}
