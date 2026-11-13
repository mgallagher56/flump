/**
 * Build-time app version for feedback mails (VITE_APP_VERSION).
 *
 * Shape: `<package version>+<7-char commit sha>`, e.g. `1.29.1+a1b2c3d`. Only the version and an
 * abbreviated public commit sha are ever produced, nothing else from the environment.
 * Pure on purpose (no fs, no process access) so it is unit-testable and safe to import from
 * vite.config.mts.
 */

const SHA_PATTERN = /^[0-9a-f]{7,40}$/i;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const EXPLICIT_PATTERN = /^[0-9A-Za-z.+-]{1,64}$/;

export const DEV_VERSION = "dev";

export interface AppVersionInput {
  /** The `version` field of the app's package.json (release-please keeps it current). */
  packageVersion?: string;
  /** Environment to read the commit sha from (Railway or GitHub Actions). */
  env: Record<string, string | undefined>;
}

function firstSha(env: AppVersionInput["env"]): string | undefined {
  for (const key of ["RAILWAY_GIT_COMMIT_SHA", "GITHUB_SHA"]) {
    const value = env[key]?.trim();
    if (value && SHA_PATTERN.test(value)) return value.slice(0, 7).toLowerCase();
  }
  return undefined;
}

export function resolveAppVersion({ packageVersion, env }: AppVersionInput): string {
  const explicit = env.VITE_APP_VERSION?.trim();
  if (explicit && EXPLICIT_PATTERN.test(explicit)) return explicit;

  const version = packageVersion?.trim();
  if (!version || !VERSION_PATTERN.test(version)) return DEV_VERSION;

  return `${version}+${firstSha(env) ?? DEV_VERSION}`;
}
