import { describe, expect, it } from "vitest";
import { resolveDbTestMode } from "./dbTestMode";

const URL = "postgres://u:p@localhost:5432/x_test";

describe("resolveDbTestMode", () => {
  it("skips when TEST_DATABASE_URL is unset and DB tests are not required", () => {
    expect(resolveDbTestMode({})).toBe("skip");
  });

  it("runs when TEST_DATABASE_URL is set", () => {
    expect(resolveDbTestMode({ TEST_DATABASE_URL: URL })).toBe("run");
  });

  it("throws when REQUIRE_DB_TESTS=1 and TEST_DATABASE_URL is unset", () => {
    expect(() => resolveDbTestMode({ REQUIRE_DB_TESTS: "1" })).toThrow(/REQUIRE_DB_TESTS/);
  });

  it("runs when REQUIRE_DB_TESTS=1 and TEST_DATABASE_URL is set", () => {
    expect(resolveDbTestMode({ REQUIRE_DB_TESTS: "1", TEST_DATABASE_URL: URL })).toBe("run");
  });

  it("treats an empty TEST_DATABASE_URL as unset", () => {
    expect(resolveDbTestMode({ TEST_DATABASE_URL: "" })).toBe("skip");
    expect(() => resolveDbTestMode({ TEST_DATABASE_URL: "", REQUIRE_DB_TESTS: "1" })).toThrow(
      /REQUIRE_DB_TESTS/,
    );
  });

  it("only treats REQUIRE_DB_TESTS=1 as required", () => {
    expect(resolveDbTestMode({ REQUIRE_DB_TESTS: "0" })).toBe("skip");
    expect(resolveDbTestMode({ REQUIRE_DB_TESTS: "" })).toBe("skip");
  });

  it("error message never contains a URL or password", () => {
    let message = "";
    try {
      resolveDbTestMode({ REQUIRE_DB_TESTS: "1", TEST_DATABASE_URL: "" });
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).not.toBe("");
    expect(message).not.toContain("postgres://");
    expect(message).not.toContain("p@");
  });
});
