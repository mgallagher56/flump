import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AgentAuditPurgeScheduler,
  isPurgeSchedulerEnabled,
  PURGE_FIRST_RUN_MS,
  PURGE_INTERVAL_MS,
} from "./agent-audit-purge.scheduler";

const make = (purge = vi.fn().mockResolvedValue(2)) => ({
  purge,
  scheduler: new AgentAuditPurgeScheduler({ purgeOlderThan13Months: purge } as never),
});

describe("AgentAuditPurgeScheduler (E17-N17, re-plan PR D)", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("is off under tests and when disabled, on otherwise", () => {
    expect(isPurgeSchedulerEnabled({ NODE_ENV: "test" })).toBe(false);
    expect(isPurgeSchedulerEnabled({ NODE_ENV: "production" })).toBe(true);
    expect(
      isPurgeSchedulerEnabled({ NODE_ENV: "production", AGENT_AUDIT_PURGE_ENABLED: "false" }),
    ).toBe(false);
    expect(isPurgeSchedulerEnabled({ NODE_ENV: "test", AGENT_AUDIT_PURGE_ENABLED: "true" })).toBe(
      true,
    );
  });

  it("does not start a timer on module init under Vitest", () => {
    vi.useFakeTimers();
    const { scheduler, purge } = make();
    scheduler.onModuleInit();
    vi.advanceTimersByTime(PURGE_INTERVAL_MS * 2);
    expect(purge).not.toHaveBeenCalled();
  });

  it("runs shortly after boot, then daily, and stops on destroy", async () => {
    vi.useFakeTimers();
    vi.stubEnv("AGENT_AUDIT_PURGE_ENABLED", "true");
    const { scheduler, purge } = make();
    scheduler.onModuleInit();
    await vi.advanceTimersByTimeAsync(PURGE_FIRST_RUN_MS);
    expect(purge).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(PURGE_INTERVAL_MS);
    expect(purge).toHaveBeenCalledTimes(2);
    scheduler.onModuleDestroy();
    await vi.advanceTimersByTimeAsync(PURGE_INTERVAL_MS * 3);
    expect(purge).toHaveBeenCalledTimes(2);
  });

  it("never throws when the purge fails, and skips an overlapping run", async () => {
    const { scheduler } = make(vi.fn().mockRejectedValue(new Error("db down")));
    await expect(scheduler.runOnce()).resolves.toBeNull();

    let release: (n: number) => void = () => {};
    const slow = vi.fn(() => new Promise<number>((r) => (release = r)));
    const { scheduler: s2 } = make(slow);
    const first = s2.runOnce();
    expect(await s2.runOnce()).toBeNull();
    release(4);
    expect(await first).toBe(4);
    expect(slow).toHaveBeenCalledTimes(1);
  });
});
