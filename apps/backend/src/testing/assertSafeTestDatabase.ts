const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * Destructive DB tests drop schemas, so refuse anything that is not clearly a throwaway
 * local database. Throws (never skips). Messages carry host and database name only,
 * never the URL or password.
 */
export function assertSafeTestDatabase(url: string, env: Record<string, string | undefined>): void {
  let host: string;
  let database: string;
  try {
    const parsed = new URL(url);
    host = parsed.hostname;
    database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  } catch {
    throw new Error("TEST_DATABASE_URL is not a valid URL; refusing to run destructive DB tests.");
  }

  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(
      `Refusing destructive DB tests: host "${host}" is not local (localhost, 127.0.0.1 or ::1).`,
    );
  }
  if (!/test/i.test(database) && env.ALLOW_DESTRUCTIVE_DB_TESTS !== "1") {
    throw new Error(
      `Refusing destructive DB tests: database "${database}" does not look like a test database. Use a name containing "test" or set ALLOW_DESTRUCTIVE_DB_TESTS=1.`,
    );
  }
}
