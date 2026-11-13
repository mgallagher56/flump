import { describe, expect, test } from "bun:test";
import { DEV_VERSION, resolveAppVersion } from "./lib/app-version";

const sha = "A1B2C3D4E5F60718293a4b5c6d7e8f9012345678";

describe("resolveAppVersion", () => {
  test("combines package version and 7-char lowercase Railway sha", () => {
    expect(
      resolveAppVersion({ packageVersion: "1.29.1", env: { RAILWAY_GIT_COMMIT_SHA: sha } }),
    ).toBe("1.29.1+a1b2c3d");
  });

  test("falls back to GITHUB_SHA", () => {
    expect(resolveAppVersion({ packageVersion: "1.29.1", env: { GITHUB_SHA: sha } })).toBe(
      "1.29.1+a1b2c3d",
    );
  });

  test("marks local builds without a sha as +dev", () => {
    expect(resolveAppVersion({ packageVersion: "1.29.1", env: {} })).toBe("1.29.1+dev");
  });

  test("ignores a malformed sha", () => {
    expect(
      resolveAppVersion({ packageVersion: "1.29.1", env: { RAILWAY_GIT_COMMIT_SHA: "$(whoami)" } }),
    ).toBe("1.29.1+dev");
  });

  test("returns dev when no package version is available", () => {
    expect(resolveAppVersion({ env: { RAILWAY_GIT_COMMIT_SHA: sha } })).toBe(DEV_VERSION);
    expect(resolveAppVersion({ packageVersion: "not-a-version", env: {} })).toBe(DEV_VERSION);
  });

  test("an explicit well-formed VITE_APP_VERSION wins, a malformed one is ignored", () => {
    expect(
      resolveAppVersion({ packageVersion: "1.0.0", env: { VITE_APP_VERSION: "2.0.0+abc1234" } }),
    ).toBe("2.0.0+abc1234");
    expect(
      resolveAppVersion({ packageVersion: "1.0.0", env: { VITE_APP_VERSION: "a b<script>" } }),
    ).toBe("1.0.0+dev");
  });

  test("a secret-looking or non-release explicit value is ignored", () => {
    for (const bad of [
      ["sk", "live", "abcdefghijklmnop"].join("_"),
      "abcdef1234567890abcdef",
      "v2",
      "2.0",
      "latest",
    ]) {
      expect(resolveAppVersion({ packageVersion: "1.0.0", env: { VITE_APP_VERSION: bad } })).toBe(
        "1.0.0+dev",
      );
    }
  });
});
