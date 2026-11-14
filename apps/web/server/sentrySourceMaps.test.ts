// @vitest-environment node
import { describe, expect, it } from "vitest";
import { sentrySourceMaps, sentryUploadConfigured } from "./sentrySourceMaps";

const FULL = { SENTRY_AUTH_TOKEN: "sntrys_test", SENTRY_ORG: "flump", SENTRY_PROJECT: "web" };

const pluginNames = (plugins: unknown[]): string[] =>
  plugins.flat(Number.POSITIVE_INFINITY).map((p) => (p as { name?: string } | null)?.name ?? "");

describe("browser source maps for Sentry (BE-07, L14)", () => {
  it("skips silently, with no maps at all, without the token, org or project", () => {
    for (const env of [
      {},
      { ...FULL, SENTRY_AUTH_TOKEN: "" },
      { ...FULL, SENTRY_AUTH_TOKEN: "   " },
      { ...FULL, SENTRY_ORG: undefined },
      { ...FULL, SENTRY_PROJECT: "" },
    ]) {
      expect(sentryUploadConfigured(env)).toBe(false);
      expect(sentrySourceMaps(env, false)).toEqual({ sourcemap: false, plugins: [] });
    }
  });

  it("never touches the server build", () => {
    expect(sentrySourceMaps(FULL, true)).toEqual({ sourcemap: false, plugins: [] });
  });

  it("emits hidden maps (no sourceMappingURL in shipped JS) and adds the upload plugin", () => {
    const settings = sentrySourceMaps(FULL, false);
    expect(settings.sourcemap).toBe("hidden");
    expect(pluginNames(settings.plugins).some((n) => n.includes("sentry"))).toBe(true);
  });
});
