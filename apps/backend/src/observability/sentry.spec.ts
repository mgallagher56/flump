import { assertSafeOptions, PRIVATE_DATA_COLLECTION } from "@flump/observability";
import * as Sentry from "@sentry/node";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { beforeSend, initSentry, WITHHELD, withholdMessages } from "./sentry";

vi.mock("@sentry/node", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sentry/node")>();
  return {
    ...actual,
    init: vi.fn(),
    captureMessage: vi.fn(),
    captureException: vi.fn(),
    onUncaughtExceptionIntegration: vi.fn(actual.onUncaughtExceptionIntegration),
    onUnhandledRejectionIntegration: vi.fn(actual.onUnhandledRejectionIntegration),
  };
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
      enableOpenTelemetrySetup: false,
      enableRuntimeChannelInjection: false,
      spotlight: false,
      includeLocalVariables: false,
      tracesSampleRate: 0,
      traceLifecycle: "static",
      dataCollection: PRIVATE_DATA_COLLECTION,
    });
    expect(opts).not.toHaveProperty("sendDefaultPii");
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
    expect([...names].sort()).toEqual(
      [
        "Dedupe",
        "EventFilters",
        "FunctionToString",
        "LinkedErrors",
        "OnUncaughtException",
        "OnUnhandledRejection",
      ].sort(),
    );
    for (const banned of [
      "Http",
      "NodeFetch",
      "Console",
      "RequestData",
      "NodeSystemError",
      "ConversationId",
      "ContextLines",
      "Context",
      "Modules",
      "LocalVariablesAsync",
      "Express",
    ]) {
      expect(names).not.toContain(banned);
    }
  });

  it("keeps Node's crash behaviour: strict rejections and exit on uncaught exceptions", () => {
    initSentry({ SENTRY_DSN: DSN });
    expect(Sentry.onUnhandledRejectionIntegration).toHaveBeenCalledExactlyOnceWith({
      mode: "strict",
    });
    expect(Sentry.onUncaughtExceptionIntegration).toHaveBeenCalledExactlyOnceWith({
      exitEvenIfOtherHandlersAreRegistered: true,
    });
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

  it("wires the message-withholding beforeSend", () => {
    initSentry({ SENTRY_DSN: DSN });
    const opts = vi.mocked(Sentry.init).mock.calls[0]?.[0] as unknown as { beforeSend: unknown };
    expect(opts.beforeSend).toBe(beforeSend);
  });
});

describe("message withholding", () => {
  const providerMessage = "balance 12.5 for John Smith at Tesco Express";
  const frames = [{ function: "run", filename: "dist/x.js", lineno: 3, in_app: true }];

  const serialise = (e: unknown) => JSON.stringify(e);

  it("replaces provider-style exception values but keeps type and frames", () => {
    const out = beforeSend({
      exception: {
        values: [{ type: "Error", value: providerMessage, stacktrace: { frames } }],
      },
    });
    expect(serialise(out)).not.toMatch(/John Smith|Tesco|12\.5/);
    const value = (out as unknown as { exception: { values: Record<string, unknown>[] } }).exception
      .values[0];
    expect(value).toMatchObject({ type: "Error", value: WITHHELD });
    expect(value?.stacktrace).toEqual({ frames: [expect.objectContaining({ function: "run" })] });
  });

  it("withholds a QueryFailedError-like message and its linked cause", () => {
    const out = beforeSend({
      exception: {
        values: [
          {
            type: "error",
            value: 'duplicate key value violates unique constraint "uq_user_email"',
          },
          {
            type: "QueryFailedError",
            value: "Key (email)=(jane.doe@example.com) already exists. INSERT INTO users",
          },
        ],
      },
    });
    const values = (out as unknown as { exception: { values: Record<string, unknown>[] } })
      .exception.values;
    expect(values.map((v) => v.type)).toEqual(["error", "QueryFailedError"]);
    expect(values.every((v) => v.value === WITHHELD)).toBe(true);
    expect(serialise(out)).not.toMatch(/jane\.doe|INSERT|uq_user_email/);
  });

  it("withholds event message and logentry, except the self-test message", () => {
    expect(withholdMessages({ message: providerMessage }).message).toBe(WITHHELD);
    expect(
      withholdMessages({ logentry: { message: "%s for %s", params: [providerMessage] } }).logentry,
    ).toEqual({ message: WITHHELD });
    expect(withholdMessages({ message: "sentry self-test" }).message).toBe("sentry self-test");
    expect(withholdMessages({ logentry: { formatted: "sentry self-test" } }).logentry).toEqual({
      message: "sentry self-test",
    });
  });
});

describe("instrument", () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
    vi.resetModules();
    vi.doUnmock("./sentry");
  });

  // instrument.ts uses a bare `require("./observability/sentry")`. Vitest cannot require a .ts
  // file, so reaching that line throws; that makes "does it try to load the module" observable.
  // The positive control proves the guard lets a DSN through, so the negatives are not vacuous.
  it("tries to load the Sentry module when a DSN is set outside test", async () => {
    process.env.NODE_ENV = "production";
    process.env.SENTRY_DSN = DSN;
    await expect(import("../instrument.js")).rejects.toThrow();
  });

  it("does not load the Sentry module or init without a DSN", async () => {
    process.env.NODE_ENV = "production";
    process.env.SENTRY_DSN = "  ";
    await expect(import("../instrument.js")).resolves.toBeDefined();
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it("does not load the Sentry module or init under NODE_ENV=test even with a DSN", async () => {
    process.env.NODE_ENV = "test";
    process.env.SENTRY_DSN = DSN;
    await expect(import("../instrument.js")).resolves.toBeDefined();
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it("does not load @sentry/node when only the filter and module are imported", async () => {
    vi.resetModules();
    let loads = 0;
    vi.doMock("@sentry/node", () => {
      loads += 1;
      return {};
    });
    await import("./sentry-exception.filter.js");
    await import("./observability.module.js");
    await import("./report.js");
    expect(loads).toBe(0);
    vi.doUnmock("@sentry/node");
  });
});
