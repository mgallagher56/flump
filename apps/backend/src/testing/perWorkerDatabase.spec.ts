import { describe, expect, it } from "vitest";
import { setUpWorkerDatabase, workerDatabaseName, workerDatabaseUrl } from "./perWorkerDatabase";

describe("per-worker test database", () => {
  it("names the worker's database after the base one and the worker id", () => {
    expect(workerDatabaseName("flump_ci_test", "3")).toBe("flump_ci_test_w3");
  });

  it("keeps host, credentials and port, and changes only the database", () => {
    expect(workerDatabaseUrl("postgres://u:p@localhost:5432/flump_ci_test", "2")).toBe(
      "postgres://u:p@localhost:5432/flump_ci_test_w2",
    );
  });

  it("keeps the whole-word 'test' the specs' safety check looks for", () => {
    expect(workerDatabaseName("flump_ci_test", "12")).toMatch(/(^|[_-])test($|[_-])/i);
  });

  it("refuses names it would have to quote, and worker ids that are not numbers", () => {
    expect(() => workerDatabaseName('x"; DROP', "1")).toThrow("letters, digits");
    expect(() => workerDatabaseName("flump_ci_test", "1; DROP")).toThrow("whole number");
  });

  it("does nothing without a database URL", async () => {
    const env: NodeJS.ProcessEnv = { VITEST_POOL_ID: "1" };
    await setUpWorkerDatabase(env);
    expect(env.TEST_DATABASE_URL).toBeUndefined();
  });

  it("refuses to share one database when there is no worker id", async () => {
    await expect(
      setUpWorkerDatabase({ TEST_DATABASE_URL: "postgres://u:p@localhost:5432/flump_ci_test" }),
    ).rejects.toThrow("VITEST_POOL_ID");
  });

  it("refuses a database that is not local before creating anything", async () => {
    await expect(
      setUpWorkerDatabase({
        TEST_DATABASE_URL: "postgres://u:p@db.example.com:5432/flump_ci_test",
        VITEST_POOL_ID: "1",
      }),
    ).rejects.toThrow("not local");
  });
});
