import { describe, expect, it } from "vitest";
import { assertSafeOptions, PRIVATE_DATA_COLLECTION } from "./sentry-options.js";

const safe = {
  dataCollection: PRIVATE_DATA_COLLECTION,
  defaultIntegrations: false,
  traceLifecycle: "static",
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
        integrations: [{ name: "Dedupe" }, "EventFilters", 5],
      }),
    ).not.toThrow();
    expect(() => assertSafeOptions({ ...safe, tracesSampleRate: null })).not.toThrow();
  });

  it("deep-freezes the shared constant, including the httpBodies array", () => {
    expect(Object.isFrozen(PRIVATE_DATA_COLLECTION)).toBe(true);
    expect(Object.isFrozen(PRIVATE_DATA_COLLECTION.httpBodies)).toBe(true);
    expect(Object.isFrozen(PRIVATE_DATA_COLLECTION.graphQL)).toBe(true);
    expect(Object.isFrozen(PRIVATE_DATA_COLLECTION.genAI)).toBe(true);
    expect(Object.isFrozen(PRIVATE_DATA_COLLECTION.mcp)).toBe(true);
    expect(() => {
      (PRIVATE_DATA_COLLECTION as { userInfo: boolean }).userInfo = true;
    }).toThrow(TypeError);
    expect(() => (PRIVATE_DATA_COLLECTION.httpBodies as string[]).push("x")).toThrow(TypeError);
  });

  it.each([undefined, true, "static2", "stream"])("rejects traceLifecycle %j", (traceLifecycle) => {
    expect(() => assertSafeOptions({ ...safe, traceLifecycle })).toThrow(/traceLifecycle/);
  });

  it.each([undefined, true, 0])("requires defaultIntegrations false, rejects %j", (v) => {
    expect(() => assertSafeOptions({ ...safe, defaultIntegrations: v })).toThrow(
      /defaultIntegrations/,
    );
  });

  it.each([true, "true", null])("rejects enableRuntimeChannelInjection %j", (v) => {
    expect(() => assertSafeOptions({ ...safe, enableRuntimeChannelInjection: v })).toThrow(
      /enableRuntimeChannelInjection/,
    );
  });

  it.each([true, "http://localhost:8969/stream", null])("rejects spotlight %j", (v) => {
    expect(() => assertSafeOptions({ ...safe, spotlight: v })).toThrow(/spotlight/);
  });

  it("accepts the server-only options when they are off", () => {
    expect(() =>
      assertSafeOptions({ ...safe, enableRuntimeChannelInjection: false, spotlight: false }),
    ).not.toThrow();
  });

  it("tolerates the v10 sendDefaultPii only when it is false", () => {
    expect(() => assertSafeOptions({ ...safe, sendDefaultPii: false })).not.toThrow();
  });

  it.each([true, "false", 1, null])("rejects the v10 sendDefaultPii %j", (sendDefaultPii) => {
    expect(() => assertSafeOptions({ ...safe, sendDefaultPii })).toThrow(/sendDefaultPii/);
  });

  it.each([undefined, null, "off", true, [], 5])("requires dataCollection, rejects %j", (v) => {
    expect(() => assertSafeOptions({ ...safe, dataCollection: v })).toThrow(/dataCollection/);
  });

  it("accepts httpHeaders as a per-direction object that is off", () => {
    const dataCollection = {
      ...PRIVATE_DATA_COLLECTION,
      httpHeaders: { request: false, response: false },
    };
    expect(() => assertSafeOptions({ ...safe, dataCollection })).not.toThrow();
  });

  it.each([
    ["userInfo", true],
    ["userInfo", undefined],
    ["cookies", true],
    ["cookies", { allow: ["a"] }],
    ["cookies", undefined],
    ["httpHeaders", true],
    ["httpHeaders", { deny: [] }],
    ["httpHeaders", { request: false }],
    ["httpHeaders", { request: false, response: true }],
    ["httpHeaders", { request: true, response: false }],
    ["httpHeaders", undefined],
    ["httpBodies", ["incomingRequest"]],
    ["httpBodies", undefined],
    ["httpBodies", "none"],
    ["urlQueryParams", true],
    ["urlQueryParams", { deny: [] }],
    ["urlQueryParams", undefined],
    ["graphQL", undefined],
    ["graphQL", { document: true, variables: false }],
    ["graphQL", { document: false, variables: true }],
    ["graphQL", { document: false }],
    ["genAI", { inputs: true, outputs: false }],
    ["genAI", { inputs: false, outputs: true }],
    ["genAI", undefined],
    ["mcp", { inputs: true, outputs: false }],
    ["mcp", { inputs: false, outputs: true }],
    ["mcp", undefined],
    ["databaseQueryData", true],
    ["databaseQueryData", undefined],
    ["queues", true],
    ["queues", undefined],
    ["stackFrameVariables", true],
    ["stackFrameVariables", { deny: ["password"] }],
    ["stackFrameVariables", undefined],
    ["frameContextLines", 5],
    ["frameContextLines", undefined],
  ])("rejects dataCollection.%s = %j", (key, value) => {
    const dataCollection = { ...PRIVATE_DATA_COLLECTION, [key]: value };
    expect(() => assertSafeOptions({ ...safe, dataCollection })).toThrow(
      new RegExp(`dataCollection\\.${key}`),
    );
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
