import { describe, expect, test } from "bun:test";
import {
  assertDistinctTargets,
  assertStagingMarker,
  connectionTarget,
  STAGING_MARKER,
} from "./staging-marker";

const db = (comment: string | undefined) => ({
  query: async () => ({ rows: comment === undefined ? [] : [{ comment }] }),
});

describe("assertStagingMarker", () => {
  test("passes only when the comment is exactly flump-staging", async () => {
    expect(STAGING_MARKER).toBe("flump-staging");
    await expect(assertStagingMarker(db("flump-staging"))).resolves.toBeUndefined();
    for (const bad of ["flump-production", "", "Flump-Staging", "flump-staging "]) {
      await expect(assertStagingMarker(db(bad))).rejects.toThrow("flump-staging");
    }
    await expect(assertStagingMarker(db(undefined))).rejects.toThrow("Refusing");
  });
});

describe("connectionTarget and assertDistinctTargets", () => {
  test("drop credentials and normalise localhost and the default port", () => {
    expect(connectionTarget("postgres://u:pw@LocalHost/db?sslmode=require")).toBe(
      "127.0.0.1:5432/db",
    );
    expect(connectionTarget("postgresql://u:pw@H.example.com:6543/d")).toBe("h.example.com:6543/d");
    expect(() => connectionTarget("mysql://u@h/d")).toThrow();
    expect(() => connectionTarget("not a url")).toThrow();
  });

  test("treat localhost, 127.0.0.1 and [::1] as the same host", () => {
    for (const host of ["localhost", "127.0.0.1", "[::1]", "LocalHost"]) {
      expect(connectionTarget(`postgres://u:p@${host}:5433/db`)).toBe("127.0.0.1:5433/db");
    }
    expect(connectionTarget("postgres://u:p@[2001:db8::1]/db")).toBe("[2001:db8::1]:5432/db");
    expect(() =>
      assertDistinctTargets("postgres://a:b@[::1]:5432/flump", "postgres://c:d@localhost/flump"),
    ).toThrow("same database");
  });

  test("reject override parameters and multi-host URLs", () => {
    for (const bad of [
      "postgres://u:p@h/db?host=x",
      "postgres://u:p@h/db?sslmode=require&PORT=5",
      "postgres://u:p@h/db?dbname=x",
      "postgres://u:p@h/db?service=x",
      "postgres://u:p@h/db?hostaddr=10.0.0.1",
      "postgres://u:p@h1:5432,h2:5432/db",
    ]) {
      expect(() => connectionTarget(bad)).toThrow();
    }
    expect(() =>
      assertDistinctTargets(
        "postgres://a:b@prod.example.com/flump",
        "postgres://c:d@stg.example.com/s?host=prod.example.com",
      ),
    ).toThrow();
  });

  test("refuse missing, equal and same-target URLs, never echoing them", () => {
    const prod = "postgres://a:secretone@prod.example.com:5432/flump";
    expect(() => assertDistinctTargets("", prod)).toThrow("required");
    expect(() => assertDistinctTargets(prod, prod)).toThrow("same database");
    let message = "";
    try {
      assertDistinctTargets(prod, "postgres://b:secrettwo@PROD.example.com/flump");
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("same database");
    expect(message).not.toContain("secret");
    expect(() =>
      assertDistinctTargets(prod, "postgres://b:x@stg.example.com:5432/flump_staging"),
    ).not.toThrow();
  });
});
