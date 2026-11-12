import { describe, expect, it } from "vitest";
import { assertSafeOptions } from "./sentry-options.js";

const safe = {
  sendDefaultPii: false,
  tracesSampleRate: 0,
  includeLocalVariables: false,
  beforeSend: () => null,
  beforeBreadcrumb: () => null,
};

describe("assertSafeOptions", () => {
  it("accepts safe options", () => {
    expect(() => assertSafeOptions(safe)).not.toThrow();
    expect(() =>
      assertSafeOptions({
        ...safe,
        tracesSampleRate: undefined,
        enableTracing: false,
        replaysSessionSampleRate: 0,
        profilesSampleRate: 0,
        profileSessionSampleRate: 0,
        integrations: [{ name: "Dedupe" }, "InboundFilters", 5],
      }),
    ).not.toThrow();
    expect(() => assertSafeOptions({ ...safe, tracesSampleRate: null })).not.toThrow();
  });

  it.each([undefined, true, "false"])("rejects sendDefaultPii %j", (sendDefaultPii) => {
    expect(() => assertSafeOptions({ ...safe, sendDefaultPii })).toThrow(/sendDefaultPii/);
  });

  it.each([
    { tracesSampleRate: 0.1 },
    { tracesSampleRate: 1 },
    { tracesSampleRate: "0.5" },
    { tracesSampler: () => 1 },
    { enableTracing: true },
    { enableTracing: "true" },
  ])("rejects tracing option %j", (extra) => {
    expect(() => assertSafeOptions({ ...safe, ...extra })).toThrow(/tracing/);
  });

  it.each([
    { profilesSampleRate: 0.5 },
    { profilesSampler: () => 1 },
    { profileSessionSampleRate: 1 },
    { profileLifecycle: "trace" },
  ])("rejects profiling option %j", (extra) => {
    expect(() => assertSafeOptions({ ...safe, ...extra })).toThrow(/profiling/);
  });

  it("rejects replay sample rates", () => {
    expect(() => assertSafeOptions({ ...safe, replaysSessionSampleRate: 0.1 })).toThrow(/replay/);
    expect(() => assertSafeOptions({ ...safe, replaysOnErrorSampleRate: 1 })).toThrow(/replay/);
  });

  it.each(["BrowserTracing", "Replay", "Feedback", "BrowserProfiling"])(
    "rejects the %s integration by object or string",
    (name) => {
      expect(() => assertSafeOptions({ ...safe, integrations: [{ name }] })).toThrow(
        /integrations/,
      );
      expect(() => assertSafeOptions({ ...safe, integrations: [name] })).toThrow(/integrations/);
    },
  );

  it("requires integrations to be an array", () => {
    expect(() => assertSafeOptions({ ...safe, integrations: () => [] })).toThrow(/array/);
  });

  it("rejects includeLocalVariables", () => {
    expect(() => assertSafeOptions({ ...safe, includeLocalVariables: true })).toThrow(
      /includeLocalVariables/,
    );
  });

  it("requires beforeSend and beforeBreadcrumb functions", () => {
    expect(() => assertSafeOptions({ ...safe, beforeSend: undefined })).toThrow(/beforeSend/);
    expect(() => assertSafeOptions({ ...safe, beforeBreadcrumb: "x" })).toThrow(/beforeBreadcrumb/);
  });
});
