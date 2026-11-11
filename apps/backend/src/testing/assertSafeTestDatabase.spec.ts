import { describe, expect, it } from "vitest";
import { assertSafeTestDatabase } from "./assertSafeTestDatabase";

describe("assertSafeTestDatabase", () => {
  it("accepts a local host with a test database name", () => {
    expect(() =>
      assertSafeTestDatabase("postgres://postgres:s3cret@localhost:55432/flump_e3_test", {}),
    ).not.toThrow();
    expect(() =>
      assertSafeTestDatabase("postgres://postgres:s3cret@127.0.0.1:55432/my_TEST_db", {}),
    ).not.toThrow();
    expect(() =>
      assertSafeTestDatabase("postgres://postgres:s3cret@[::1]:55432/flump_e3_test", {}),
    ).not.toThrow();
  });

  it("rejects a local host with a non-test database name", () => {
    expect(() =>
      assertSafeTestDatabase("postgres://postgres:s3cret@localhost:55432/postgres", {}),
    ).toThrow(/ALLOW_DESTRUCTIVE_DB_TESTS/);
  });

  it("rejects a remote host even with a test database name or the override", () => {
    expect(() =>
      assertSafeTestDatabase("postgres://postgres:s3cret@db.example.com:5432/flump_e3_test", {}),
    ).toThrow(/local/i);
    expect(() =>
      assertSafeTestDatabase("postgres://postgres:s3cret@db.example.com:5432/postgres", {
        ALLOW_DESTRUCTIVE_DB_TESTS: "1",
      }),
    ).toThrow(/local/i);
  });

  it("accepts a local non-test database name only with ALLOW_DESTRUCTIVE_DB_TESTS=1", () => {
    expect(() =>
      assertSafeTestDatabase("postgres://postgres:s3cret@localhost:55432/postgres", {
        ALLOW_DESTRUCTIVE_DB_TESTS: "1",
      }),
    ).not.toThrow();
  });

  it("never puts the password or URL in the error message", () => {
    for (const url of [
      "postgres://postgres:s3cret@localhost:55432/postgres",
      "postgres://postgres:s3cret@db.example.com:5432/flump_e3_test",
      "not a url but s3cret",
    ]) {
      let message = "";
      try {
        assertSafeTestDatabase(url, {});
      } catch (e) {
        message = (e as Error).message;
      }
      expect(message).not.toBe("");
      expect(message).not.toContain("s3cret");
      expect(message).not.toContain("postgres://");
    }
  });
});
