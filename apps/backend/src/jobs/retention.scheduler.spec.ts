import { Logger } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CHECK_INTERVAL_MS,
  FIRST_CHECK_DELAY_MS,
  RetentionScheduler,
  retentionScheduleEnabled,
} from "./retention.scheduler";

/** A DataSource whose query runner fails to connect with `error`, or answers like an empty DB. */
function fakeDataSource(error?: Error) {
  const runner = {
    connect: vi.fn(async () => {
      if (error) throw error;
    }),
    release: vi.fn(async () => undefined),
    query: vi.fn(async (sql: string) => {
      if (sql.includes("pg_try_advisory_lock")) return [{ locked: true }];
      if (sql.includes("to_regclass")) return [{ t: null }];
      if (sql.includes("count(*)")) return [{ n: 0 }];
      return [];
    }),
  };
  const ds = { createQueryRunner: vi.fn(() => runner) };
  return { ds, runner };
}

describe("RetentionScheduler (D5 revised)", () => {
  const saved = process.env.RETENTION_SCHEDULE_ENABLED;
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    if (saved === undefined) delete process.env.RETENTION_SCHEDULE_ENABLED;
    else process.env.RETENTION_SCHEDULE_ENABLED = saved;
  });

  it.each([
    [undefined, true],
    ["", true],
    ["true", true],
    ["false", false],
    [" FALSE ", false],
  ])("the switch %j reads as on=%s", (value, on) => {
    expect(retentionScheduleEnabled({ RETENTION_SCHEDULE_ENABLED: value })).toBe(on);
  });

  it("a failed check logs the error name only, never throws, and releases its connection", async () => {
    const errors: string[] = [];
    vi.spyOn(Logger.prototype, "error").mockImplementation((m: unknown) => {
      errors.push(String(m));
    });
    const { ds, runner } = fakeDataSource(
      Object.assign(new Error("password authentication failed for postgres://u:secret@db"), {
        name: "QueryFailedError",
      }),
    );
    await expect(new RetentionScheduler(ds as never).check()).resolves.toBeUndefined();
    expect(errors).toEqual(["retention run failed (QueryFailedError); retrying at the next check"]);
    expect(runner.release).toHaveBeenCalledTimes(1);
  });

  it("a check while switched off opens no connection", async () => {
    process.env.RETENTION_SCHEDULE_ENABLED = "false";
    const { ds } = fakeDataSource();
    await new RetentionScheduler(ds as never).check();
    expect(ds.createQueryRunner).not.toHaveBeenCalled();
  });

  it("first checks a few minutes after boot, then every 15 minutes, and stops on shutdown", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    const { ds } = fakeDataSource();
    const scheduler = new RetentionScheduler(ds as never);
    scheduler.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(FIRST_CHECK_DELAY_MS - 1);
    expect(ds.createQueryRunner).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(ds.createQueryRunner).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(CHECK_INTERVAL_MS);
    expect(ds.createQueryRunner).toHaveBeenCalledTimes(2);
    await scheduler.onModuleDestroy();
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(CHECK_INTERVAL_MS * 4);
    expect(ds.createQueryRunner).toHaveBeenCalledTimes(2);
  });
});
