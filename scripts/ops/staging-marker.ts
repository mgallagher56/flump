// TypeScript twin of lib-staging.sh: the reusable "database comment must equal flump-staging"
// guard. E18-N11 (seed-synthetic.ts) imports this before it deletes or inserts anything.
//
//   import { assertStagingMarker } from "./staging-marker";
//   await assertStagingMarker(client); // throws unless the comment is 'flump-staging'
//
// Messages never contain a connection string, user or password.

export const STAGING_MARKER = "flump-staging";

export const STAGING_MARKER_SQL =
  "SELECT coalesce(shobj_description(d.oid, 'pg_database'), '') AS comment " +
  "FROM pg_database d WHERE d.datname = current_database()";

// The slice of a pg Client / Pool this helper needs (so no pg import is required here).
export interface MarkerQueryable {
  query(sql: string): Promise<{ rows: Array<{ comment: string }> }>;
}

export async function assertStagingMarker(db: MarkerQueryable): Promise<void> {
  const { rows } = await db.query(STAGING_MARKER_SQL);
  if (rows[0]?.comment !== STAGING_MARKER) {
    throw new Error(
      `Refusing: the target database comment is not '${STAGING_MARKER}' ` +
        `(set it once with COMMENT ON DATABASE <staging db> IS '${STAGING_MARKER}').`,
    );
  }
}

// "host:port/db" with no credentials; localhost, 127.0.0.1 and [::1] all normalise to 127.0.0.1.
// Throws on anything that is not a plain single-host postgres URL: a comma in the host list or a
// query parameter that can override the target (host, hostaddr, port, dbname, service).
const OVERRIDE_PARAMS = new Set(["host", "hostaddr", "port", "dbname", "service"]);

export function connectionTarget(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Not a valid postgres URL.");
  }
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("Not a postgres URL.");
  }
  const authority = url.slice(url.indexOf("://") + 3).split("/")[0] ?? "";
  if (authority.includes(",") || parsed.hostname.includes(",")) {
    throw new Error("Multi-host postgres URLs are not accepted.");
  }
  for (const key of parsed.searchParams.keys()) {
    if (OVERRIDE_PARAMS.has(key.toLowerCase())) {
      throw new Error(
        `The URL parameter '${key.toLowerCase()}' can override the target; refusing.`,
      );
    }
  }
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!parsed.hostname || !database) throw new Error("The URL needs a host and a database.");
  const lower = parsed.hostname.toLowerCase();
  const host = ["localhost", "[::1]", "::1", "127.0.0.1"].includes(lower) ? "127.0.0.1" : lower;
  return `${host}:${parsed.port || "5432"}/${database}`;
}

export function assertDistinctTargets(productionUrl: string, stagingUrl: string): void {
  if (!productionUrl || !stagingUrl) {
    throw new Error("Both production and staging URLs are required.");
  }
  if (
    productionUrl === stagingUrl ||
    connectionTarget(productionUrl) === connectionTarget(stagingUrl)
  ) {
    throw new Error("Refusing: the staging target is the same database as production.");
  }
}
