// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const pluginOptions = vi.hoisted(() => ({ calls: [] as Record<string, any>[] }));

vi.mock("@sentry/vite-plugin", () => ({
  sentryVitePlugin: (options: Record<string, any>) => {
    pluginOptions.calls.push(options);
    return { name: "sentry-test" };
  },
}));

import { sentrySourceMaps, sentryUploadConfigured } from "./sentrySourceMaps";

// Built at runtime so no token-shaped literal sits in the source.
const token = `test-${Math.random().toString(36).slice(2)}`;
const FULL = { SENTRY_AUTH_TOKEN: token, SENTRY_ORG: "flump", SENTRY_PROJECT: "web" };

const optionsFor = (env: Record<string, string | undefined>) => {
  pluginOptions.calls.length = 0;
  sentrySourceMaps(env, false);
  expect(pluginOptions.calls).toHaveLength(1);
  return pluginOptions.calls[0];
};

afterEach(() => vi.restoreAllMocks());

describe("sentryUploadConfigured with blank or missing values", () => {
  it("is false when the org or project is only spaces or missing", () => {
    expect(sentryUploadConfigured({ ...FULL, SENTRY_ORG: "   " })).toBe(false);
    expect(sentryUploadConfigured({ ...FULL, SENTRY_PROJECT: "   " })).toBe(false);
    expect(sentryUploadConfigured({ ...FULL, SENTRY_PROJECT: undefined })).toBe(false);
  });
});

describe("Sentry upload plugin options", () => {
  it("passes the trimmed token, org and project, with no telemetry", () => {
    const options = optionsFor({
      SENTRY_AUTH_TOKEN: ` ${token} `,
      SENTRY_ORG: " flump ",
      SENTRY_PROJECT: " web ",
    });
    expect(options.authToken).toBe(token);
    expect(options.org).toBe("flump");
    expect(options.project).toBe("web");
    expect(options.telemetry).toBe(false);
    expect(options).not.toHaveProperty("url");
  });

  it("passes a self-hosted Sentry URL only when one is set, trimmed", () => {
    expect(optionsFor({ ...FULL, SENTRY_URL: " https://sentry.example.test/ " }).url).toBe(
      "https://sentry.example.test/",
    );
    expect(optionsFor({ ...FULL, SENTRY_URL: "   " })).not.toHaveProperty("url");
  });

  it("uploads the client build and deletes every map afterwards", () => {
    expect(optionsFor(FULL).sourcemaps).toEqual({
      assets: ["./build/client/**"],
      filesToDeleteAfterUpload: ["./build/client/**/*.map"],
    });
  });

  it("creates no release unless one is named, and never injects one", () => {
    expect(optionsFor(FULL).release).toEqual({ inject: false, create: false });
    expect(optionsFor({ ...FULL, SENTRY_RELEASE: " 1.28.0 " }).release).toEqual({
      name: "1.28.0",
      inject: false,
    });
  });

  it("warns on an upload failure instead of failing the build", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { errorHandler } = optionsFor(FULL);
    expect(() => errorHandler(new Error("401 Unauthorized"))).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
