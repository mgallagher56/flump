import { assertSafeOptions, PRIVATE_DATA_COLLECTION } from "@flump/observability";
import * as Sentry from "@sentry/node";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  beforeSend,
  initSentry,
  PRODUCTION_TRACES_SAMPLE_RATE,
  resolveTracesSampleRate,
  scrubTransaction,
  WITHHELD,
  withholdMessages,
} from "./sentry";

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
    expect(opts.beforeSendTransaction).toBe(scrubTransaction);
  });

  it("samples 2% of traces in production (D7)", () => {
    initSentry({ SENTRY_DSN: DSN, NODE_ENV: "production" });
    const opts = vi.mocked(Sentry.init).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(() => assertSafeOptions(opts)).not.toThrow();
    expect(opts.tracesSampleRate).toBe(0.02);
    expect(opts.traceLifecycle).toBe("static");
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

describe("resolveTracesSampleRate", () => {
  it("is 0.02 in production and 0 elsewhere, including test", () => {
    expect(PRODUCTION_TRACES_SAMPLE_RATE).toBe(0.02);
    expect(resolveTracesSampleRate({ NODE_ENV: "production" })).toBe(0.02);
    expect(resolveTracesSampleRate({ NODE_ENV: "test" })).toBe(0);
    expect(resolveTracesSampleRate({ NODE_ENV: "development" })).toBe(0);
    expect(resolveTracesSampleRate({})).toBe(0);
  });

  it("takes SENTRY_TRACES_SAMPLE_RATE from 0 to 1 and ignores anything else", () => {
    expect(
      resolveTracesSampleRate({ NODE_ENV: "production", SENTRY_TRACES_SAMPLE_RATE: "0" }),
    ).toBe(0);
    expect(resolveTracesSampleRate({ SENTRY_TRACES_SAMPLE_RATE: "0.5" })).toBe(0.5);
    expect(
      resolveTracesSampleRate({ NODE_ENV: "production", SENTRY_TRACES_SAMPLE_RATE: "5" }),
    ).toBe(0.02);
    expect(resolveTracesSampleRate({ SENTRY_TRACES_SAMPLE_RATE: "lots" })).toBe(0);
  });
});

describe("scrubTransaction", () => {
  const SENTINEL = "SENTINEL-leak-7";
  const transaction = {
    type: "transaction",
    event_id: "abc",
    timestamp: 2,
    start_timestamp: 1,
    platform: "node",
    environment: "production",
    release: "0123456",
    server_name: "backend",
    sdk: { name: "sentry.javascript.node", version: "11.11.0" },
    transaction: "GET /accounts/:id",
    contexts: {
      trace: {
        trace_id: "t",
        span_id: "s",
        op: "http.server",
        status: "ok",
        data: { "http.response.status_code": 200, "url.full": `https://x/?q=${SENTINEL}` },
      },
      runtime: { name: SENTINEL },
    },
    tags: { request_id: "web-req-000001", other: SENTINEL },
    request: {
      url: `https://x/a?token=${SENTINEL}`,
      query_string: SENTINEL,
      headers: { authorization: SENTINEL },
      cookies: { session: SENTINEL },
      data: { secret: SENTINEL },
    },
    user: { id: SENTINEL },
    extra: { body: SENTINEL },
    breadcrumbs: [{ message: SENTINEL }],
    measurements: { x: { value: 1 } },
    spans: [{ description: `SELECT ${SENTINEL}` }],
  };

  it("keeps ids, timing, route name, status and request id, and drops everything else", () => {
    const out = scrubTransaction(structuredClone(transaction));
    expect(JSON.stringify(out)).not.toContain(SENTINEL);
    expect(out).toEqual({
      type: "transaction",
      event_id: "abc",
      timestamp: 2,
      start_timestamp: 1,
      platform: "node",
      environment: "production",
      release: "0123456",
      server_name: "backend",
      sdk: { name: "sentry.javascript.node", version: "11.11.0" },
      transaction: "GET /accounts/:id",
      contexts: {
        trace: {
          trace_id: "t",
          span_id: "s",
          op: "http.server",
          status: "ok",
          data: { "http.response.status_code": 200 },
        },
      },
      tags: { request_id: "web-req-000001" },
      spans: [],
    });
  });

  it("replaces a name that is not a route template", () => {
    const out = scrubTransaction({ ...transaction, transaction: `GET /a?token=${SENTINEL}` });
    expect(out?.transaction).toBe("unmatched");
  });

  it("drops anything that is not a transaction", () => {
    expect(scrubTransaction({ type: "event" })).toBeNull();
  });
});
