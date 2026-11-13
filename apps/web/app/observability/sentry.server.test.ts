import { assertSafeOptions } from "@flump/observability";
import * as Sentry from "@sentry/node";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WITHHELD, withholdMessages } from "./withhold";

vi.mock("@sentry/node", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sentry/node")>();
  return {
    ...actual,
    init: vi.fn(),
    captureException: vi.fn(),
    onUncaughtExceptionIntegration: vi.fn(actual.onUncaughtExceptionIntegration),
    onUnhandledRejectionIntegration: vi.fn(actual.onUnhandledRejectionIntegration),
  };
});

const DSN = "http://public@127.0.0.1:9/1";

async function load() {
  vi.resetModules();
  return await import("./sentry.server");
}

describe("sentry.server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("is inert without a DSN: importing the module does not initialise the SDK", async () => {
    vi.stubEnv("SENTRY_DSN", "");
    const { initSentry, reportServerError } = await load();
    expect(Sentry.init).not.toHaveBeenCalled();
    expect(initSentry({})).toBe(false);
    expect(initSentry({ SENTRY_DSN: "   " })).toBe(false);
    reportServerError(new Error("boom"), new Request("http://localhost/"));
    expect(Sentry.init).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("positive control: importing the module with a DSN initialises the SDK", async () => {
    vi.stubEnv("SENTRY_DSN", DSN);
    await load();
    expect(Sentry.init).toHaveBeenCalledOnce();
  });

  it("passes options that satisfy assertSafeOptions", async () => {
    const { initSentry } = await load();
    expect(initSentry({ SENTRY_DSN: DSN, SENTRY_RELEASE: "abc1234" })).toBe(true);
    const opts = vi.mocked(Sentry.init).mock.calls[0]?.[0] as unknown as Record<string, unknown>;
    expect(() => assertSafeOptions(opts)).not.toThrow();
    expect(opts).toMatchObject({
      dsn: DSN,
      release: "abc1234",
      serverName: "web",
      environment: "unknown",
      skipOpenTelemetrySetup: true,
      defaultIntegrations: false,
      includeLocalVariables: false,
      tracesSampleRate: 0,
    });
    expect((opts.beforeSendTransaction as () => unknown)()).toBeNull();
  });

  it("keeps only allow-listed integrations", async () => {
    const { initSentry } = await load();
    initSentry({ SENTRY_DSN: DSN });
    const opts = vi.mocked(Sentry.init).mock.calls[0]?.[0] as unknown as {
      integrations: { name: string }[];
    };
    const names = opts.integrations.map((i) => i.name);
    expect(names).toEqual(
      expect.arrayContaining(["InboundFilters", "OnUncaughtException", "OnUnhandledRejection"]),
    );
    for (const banned of ["Http", "NodeFetch", "Console", "RequestData", "LocalVariablesAsync"]) {
      expect(names).not.toContain(banned);
    }
  });

  it("keeps Node's crash behaviour", async () => {
    const { initSentry } = await load();
    initSentry({ SENTRY_DSN: DSN });
    expect(Sentry.onUnhandledRejectionIntegration).toHaveBeenCalledExactlyOnceWith({
      mode: "strict",
    });
    expect(Sentry.onUncaughtExceptionIntegration).toHaveBeenCalledExactlyOnceWith({
      exitEvenIfOtherHandlersAreRegistered: true,
    });
  });

  describe("reportServerError", () => {
    it("captures a 500 error and logs only the safe summary", async () => {
      const { initSentry, reportServerError } = await load();
      initSentry({ SENTRY_DSN: DSN });
      const error = new Error("Backend failed: token=secret-value");
      reportServerError(error, new Request("http://localhost/"));
      expect(Sentry.captureException).toHaveBeenCalledExactlyOnceWith(error);
      expect(console.error).toHaveBeenCalledExactlyOnceWith("Error (Backend failed)");
    });

    it("reports the same error object once even if both handlers see it", async () => {
      const { initSentry, reportServerError } = await load();
      initSentry({ SENTRY_DSN: DSN });
      const error = new Error("boom");
      const request = new Request("http://localhost/");
      reportServerError(error, request);
      reportServerError(error, request);
      expect(Sentry.captureException).toHaveBeenCalledOnce();
      expect(console.error).toHaveBeenCalledOnce();
    });

    it("ignores aborted requests", async () => {
      const { initSentry, reportServerError } = await load();
      initSentry({ SENTRY_DSN: DSN });
      const controller = new AbortController();
      controller.abort();
      reportServerError(
        new Error("x"),
        new Request("http://localhost/", { signal: controller.signal }),
      );
      expect(Sentry.captureException).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
    });

    it("ignores thrown Responses below 500 and captures 500 and above", async () => {
      const { initSentry, reportServerError } = await load();
      initSentry({ SENTRY_DSN: DSN });
      const request = new Request("http://localhost/");
      reportServerError(new Response(null, { status: 302 }), request);
      reportServerError(new Response(null, { status: 401 }), request);
      reportServerError(new Response(null, { status: 404 }), request);
      expect(Sentry.captureException).not.toHaveBeenCalled();
      reportServerError(new Response(null, { status: 503 }), request);
      expect(Sentry.captureException).toHaveBeenCalledOnce();
    });

    it("logs but does not capture when the SDK is not initialised", async () => {
      const { reportServerError } = await load();
      reportServerError(new Error("boom"), new Request("http://localhost/"));
      expect(console.error).toHaveBeenCalledOnce();
      expect(Sentry.captureException).not.toHaveBeenCalled();
    });
  });
});

describe("message withholding", () => {
  it("replaces every exception value, the message and the logentry", async () => {
    const { beforeSend } = await import("./withhold");
    const out = beforeSend({
      message: "user ada@example.com failed",
      logentry: { message: "bad %s", formatted: "bad secret" },
      exception: {
        values: [
          { type: "Error", value: "provider said: account 12345678" },
          { type: "Error", value: "cause text" },
        ],
      },
    }) as {
      message: string;
      logentry: { message: string };
      exception: { values: { type: string; value: string }[] };
    };
    expect(out.message).toBe(WITHHELD);
    expect(out.logentry.message).toBe(WITHHELD);
    expect(out.exception.values.map((v) => v.value)).toEqual([WITHHELD, WITHHELD]);
    expect(out.exception.values.map((v) => v.type)).toEqual(["Error", "Error"]);
  });

  it("withholdMessages leaves events without messages alone", () => {
    expect(withholdMessages({ level: "error" })).toEqual({ level: "error" });
  });
});
