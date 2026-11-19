import { afterEach, describe, expect, it, vi } from "vitest";
import { errorName, noopLogger, stderrLogger } from "./logger.js";

describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("the default logger writes both levels to stderr (console.error), never stdout", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const out = vi.spyOn(console, "log").mockImplementation(() => undefined);
    stderrLogger.warn("w");
    stderrLogger.error("e");
    expect(err.mock.calls).toEqual([["w"], ["e"]]);
    expect(out).not.toHaveBeenCalled();
  });

  it("the no-op logger accepts both levels and writes nothing", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => {
      noopLogger.warn("w");
      noopLogger.error("e");
    }).not.toThrow();
    expect(err).not.toHaveBeenCalled();
  });

  it("names an error by its class, and anything else by a fixed word, never its text", () => {
    expect(errorName(new TypeError("secret detail"))).toBe("TypeError");
    expect(errorName("secret detail")).toBe("error");
  });
});
