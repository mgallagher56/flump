export type DbTestMode = "run" | "skip";

/**
 * Decides whether the real-Postgres integration suites run.
 *
 * - TEST_DATABASE_URL set (non-empty): "run".
 * - TEST_DATABASE_URL unset or empty: "skip" locally.
 * - ...but when REQUIRE_DB_TESTS is "1" (CI), a missing URL throws so the suite
 *   fails at collection instead of being skipped silently.
 *
 * The error message deliberately never includes the URL.
 */
export function resolveDbTestMode(env: Record<string, string | undefined>): DbTestMode {
  if (env.TEST_DATABASE_URL) {
    return "run";
  }
  if (env.REQUIRE_DB_TESTS === "1") {
    throw new Error(
      "REQUIRE_DB_TESTS=1 but TEST_DATABASE_URL is not set; the real-Postgres migration tests would be skipped.",
    );
  }
  return "skip";
}
