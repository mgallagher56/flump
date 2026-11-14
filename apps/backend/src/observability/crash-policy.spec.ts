import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EnvValidationError } from "../config/env.schema";
import {
  CRASH_FLUSH_TIMEOUT_MS,
  crash,
  installCrashHandlers,
  resetCrashStateForTests,
} from "./crash-policy";

function deps(overrides: { flush?: (ms: number) => Promise<void> } = {}) {
  return {
    logger: { fatal: vi.fn(), error: vi.fn() },
    report: vi.fn(),
    flush: vi.fn(overrides.flush ?? (async () => undefined)),
    exit: vi.fn(),
  };
}

beforeEach(() => resetCrashStateForTests());
afterEach(() => vi.useRealTimers());

describe("crash", () => {
  it("logs, reports, flushes with the timeout and exits 1", async () => {
    const d = deps();
    const error = new EnvValidationError([
      { variable: "DATABASE_URL", problem: "is required in production" },
    ]);
    await crash("bootstrap", error, d);
    expect(d.logger.fatal).toHaveBeenCalledWith(error, "Crash(bootstrap)");
    expect(d.report).toHaveBeenCalledWith(error);
    expect(d.flush).toHaveBeenCalledWith(CRASH_FLUSH_TIMEOUT_MS);
    expect(d.exit).toHaveBeenCalledWith(1);
  });

  it("wraps a non-Error rejection reason", async () => {
    const d = deps();
    await crash("unhandledRejection", "plain reason", d);
    const logged = d.logger.fatal.mock.calls[0]?.[0] as Error;
    expect(logged).toBeInstanceOf(Error);
    expect(d.exit).toHaveBeenCalledWith(1);
  });

  it("exits even when the flush hangs", async () => {
    vi.useFakeTimers();
    const d = deps({ flush: () => new Promise<void>(() => undefined) });
    const done = crash("uncaughtException", new Error("boom"), d);
    await vi.advanceTimersByTimeAsync(CRASH_FLUSH_TIMEOUT_MS + 600);
    await done;
    expect(d.exit).toHaveBeenCalledWith(1);
  });

  it("exits even when logging and reporting throw", async () => {
    const d = deps();
    d.logger.fatal.mockImplementation(() => {
      throw new Error("logger broke");
    });
    d.report.mockImplementation(() => {
      throw new Error("reporter broke");
    });
    await crash("bootstrap", new Error("boom"), d);
    expect(d.exit).toHaveBeenCalledWith(1);
  });

  it("handles only the first crash", async () => {
    const d = deps();
    await crash("bootstrap", new Error("one"), d);
    await crash("uncaughtException", new Error("two"), d);
    expect(d.logger.fatal).toHaveBeenCalledTimes(1);
    expect(d.exit).toHaveBeenCalledTimes(1);
  });
});

describe("installCrashHandlers", () => {
  it("routes uncaught exceptions and unhandled rejections through crash", async () => {
    const proc = new EventEmitter() as unknown as NodeJS.Process;
    const d = deps();
    installCrashHandlers(d, proc);
    proc.emit("unhandledRejection", new Error("rejected"));
    await vi.waitFor(() => expect(d.exit).toHaveBeenCalledWith(1));
    expect(d.logger.fatal.mock.calls[0]?.[1]).toBe("Crash(unhandledRejection)");

    resetCrashStateForTests();
    proc.emit("uncaughtException", new Error("thrown"));
    await vi.waitFor(() => expect(d.exit).toHaveBeenCalledTimes(2));
    expect(d.logger.fatal.mock.calls[1]?.[1]).toBe("Crash(uncaughtException)");
  });
});
