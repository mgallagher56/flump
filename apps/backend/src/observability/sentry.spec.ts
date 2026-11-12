import { assertSafeOptions } from "@flump/observability";
import * as Sentry from "@sentry/node";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initSentry } from "./sentry";

vi.mock("@sentry/node", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sentry/node")>();
  return { ...actual, init: vi.fn(), captureMessage: vi.fn(), captureException: vi.fn() };
});

const DSN = "http://public@127.0.0.1:9/1";

describe("initSentry", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does nothing without a DSN", () => {
    expect(initSentry({})).toBe(false);
    expect(initSentry({ SENTRY_DSN: "   " })).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it("passes options that satisfy assertSafeOptions", () => {
    expect(initSentry({ SENTRY_DSN: DSN, RAILWAY_GIT_COMMIT_SHA: "0123456789abcdef" })).toBe(true);
    const opts = vi.mocked(Sentry.init).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(() => assertSafeOptions(opts)).not.toThrow();
    expect(opts).toMatchObject({
      dsn: DSN,
      release: "0123456",
      serverName: "backend",
      environment: "unknown",
      skipOpenTelemetrySetup: true,
      includeLocalVariables: false,
      tracesSampleRate: 0,
    });
    expect((opts.beforeSendTransaction as () => unknown)()).toBeNull();
  });

  it("keeps only allow-listed integrations and drops the defaults", () => {
    initSentry({ SENTRY_DSN: DSN });
    const opts = vi.mocked(Sentry.init).mock.calls[0]?.[0] as unknown as {
      defaultIntegrations: unknown;
      integrations: { name: string }[];
    };
    const names = opts.integrations.map((i) => i.name);
    expect(opts.defaultIntegrations).toBe(false);
    expect(names).toEqual(
      expect.arrayContaining(["InboundFilters", "OnUncaughtException", "OnUnhandledRejection"]),
    );
    for (const banned of [
      "Http",
      "NodeFetch",
      "Console",
      "RequestData",
      "LocalVariablesAsync",
      "Express",
    ]) {
      expect(names).not.toContain(banned);
    }
  });

  it("uses SENTRY_ENVIRONMENT before the Railway name", () => {
    initSentry({ SENTRY_DSN: DSN, SENTRY_ENVIRONMENT: "staging", RAILWAY_ENVIRONMENT_NAME: "x" });
    expect(vi.mocked(Sentry.init).mock.calls[0]?.[0]).toMatchObject({ environment: "staging" });
  });

  it("sends the fixed self-test message only when asked", () => {
    initSentry({ SENTRY_DSN: DSN });
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
    initSentry({ SENTRY_DSN: DSN, SENTRY_SELFTEST_ON_BOOT: "1" });
    expect(Sentry.captureMessage).toHaveBeenCalledExactlyOnceWith("sentry self-test");
  });
});

describe("instrument", () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
    vi.resetModules();
  });

  const loaded = () =>
    Object.keys(require.cache).some((k) => /observability[\\/]sentry\.[jt]s$/.test(k));

  it("does not require the Sentry module without a DSN", async () => {
    process.env.NODE_ENV = "production";
    process.env.SENTRY_DSN = "";
    await import("../instrument.js");
    expect(loaded()).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it("does not require the Sentry module under NODE_ENV=test even with a DSN", async () => {
    process.env.NODE_ENV = "test";
    process.env.SENTRY_DSN = DSN;
    await import("../instrument.js");
    expect(loaded()).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
  });
});
