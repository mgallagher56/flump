import { describe, expect, it } from "vitest";
import { assertSafeOptions } from "./sentry-options.js";

const safe = { sendDefaultPii: false, tracesSampleRate: 0, includeLocalVariables: false };

describe("assertSafeOptions", () => {
  it("accepts safe options", () => {
    expect(() => assertSafeOptions(safe)).not.toThrow();
    expect(() =>
      assertSafeOptions({
        sendDefaultPii: false,
        replaysSessionSampleRate: 0,
        integrations: [{ name: "Dedupe" }, "x"],
      }),
    ).not.toThrow();
  });

  it.each([undefined, true, "false"])("rejects sendDefaultPii %j", (sendDefaultPii) => {
    expect(() => assertSafeOptions({ ...safe, sendDefaultPii })).toThrow(/sendDefaultPii/);
  });

  it.each([0.1, 1, "0.5"])("rejects tracesSampleRate %j", (tracesSampleRate) => {
    expect(() => assertSafeOptions({ ...safe, tracesSampleRate })).toThrow(/tracesSampleRate/);
  });

  it("allows unset or null tracesSampleRate", () => {
    expect(() =>
      assertSafeOptions({ sendDefaultPii: false, tracesSampleRate: null }),
    ).not.toThrow();
    expect(() => assertSafeOptions({ sendDefaultPii: false })).not.toThrow();
  });

  it("rejects replay sample rates and the replay integration", () => {
    expect(() => assertSafeOptions({ ...safe, replaysSessionSampleRate: 0.1 })).toThrow(/replay/);
    expect(() => assertSafeOptions({ ...safe, replaysOnErrorSampleRate: 1 })).toThrow(/replay/);
    expect(() => assertSafeOptions({ ...safe, integrations: [{ name: "Replay" }] })).toThrow(
      /replay/,
    );
  });

  it("rejects includeLocalVariables", () => {
    expect(() => assertSafeOptions({ ...safe, includeLocalVariables: true })).toThrow(
      /includeLocalVariables/,
    );
  });
});
