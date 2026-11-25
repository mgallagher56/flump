import { BadRequestException, Logger } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { DataSource } from "typeorm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WellbeingQuestionsService, wellbeingQuestionsPaused } from "./wellbeing-questions.service";

// 31 Mar 2027 23:30 UTC is 1 Apr 00:30 in London (BST from 28 March): the second quarter.
const LONDON_Q2_START = new Date("2027-03-31T23:30:00Z");
const SENTINEL = "I lost my job and the debt page made it worse";

function build(options: { paused?: string; statusRow?: object; inserted?: unknown[] } = {}) {
  const query = vi.fn().mockResolvedValue([options.statusRow ?? { on: true, recorded: false }]);
  const txQuery = vi.fn().mockResolvedValue(options.inserted ?? [{ inserted: 1 }]);
  const transaction = vi.fn(async (work: (m: { query: typeof txQuery }) => unknown) =>
    work({ query: txQuery }),
  );
  const config = { get: vi.fn().mockReturnValue(options.paused) };
  const service = new WellbeingQuestionsService(
    { query, transaction } as unknown as DataSource,
    config as unknown as ConfigService,
  );
  return { service, query, txQuery, transaction };
}

afterEach(() => vi.restoreAllMocks());

describe("wellbeingQuestionsPaused", () => {
  it("is true only for true, in any case and with spaces", () => {
    expect(wellbeingQuestionsPaused("true")).toBe(true);
    expect(wellbeingQuestionsPaused(" TRUE ")).toBe(true);
    expect(wellbeingQuestionsPaused("false")).toBe(false);
    expect(wellbeingQuestionsPaused(undefined)).toBe(false);
    expect(wellbeingQuestionsPaused("")).toBe(false);
  });
});

describe("WellbeingQuestionsService.status", () => {
  it("is due when switched on and nothing is recorded, for the London quarter", async () => {
    const { service, query } = build({ statusRow: { on: true, recorded: false } });
    expect(await service.status("u-1", LONDON_Q2_START)).toEqual({ due: true });
    expect(query.mock.calls[0]?.[1]).toEqual(["u-1", "2027-04-01"]);
  });

  it("is not due once the quarter has a record", async () => {
    const { service } = build({ statusRow: { on: true, recorded: true } });
    expect(await service.status("u-1", LONDON_Q2_START)).toEqual({ due: false });
  });

  it("is not due when the person switched the questions off", async () => {
    const { service } = build({ statusRow: { on: false, recorded: false } });
    expect(await service.status("u-1", LONDON_Q2_START)).toEqual({ due: false });
  });

  it("is not due when paused for everyone, and reads nothing", async () => {
    const { service, query } = build({ paused: "true" });
    expect(await service.status("u-1", LONDON_Q2_START)).toEqual({ due: false });
    expect(query).not.toHaveBeenCalled();
  });

  it("asks when the pause is set to false", async () => {
    const { service } = build({ paused: "false" });
    expect(await service.status("u-1", LONDON_Q2_START)).toEqual({ due: true });
  });
});

describe("WellbeingQuestionsService.record", () => {
  it("inserts the answer for the London quarter in a transaction, first record standing", async () => {
    const { service, txQuery, transaction } = build();
    const result = await service.record(
      "u-1",
      { feeling: "more_worried", worseText: "  Too many numbers.  " },
      LONDON_Q2_START,
    );
    expect(result).toEqual({ recorded: true });
    expect(transaction).toHaveBeenCalledOnce();
    const [sql, params] = txQuery.mock.calls[0] as [string, unknown[]];
    expect(params).toEqual(["u-1", "2027-04-01", "more_worried", "Too many numbers."]);
    expect(sql).toContain(`ON CONFLICT ("user_id", "quarter") DO NOTHING`);
    // The switch is read under FOR SHARE, so a switch-off in flight is waited for.
    expect(sql).toContain("FOR SHARE");
  });

  it("records a skip as two nulls, and an all-space answer as null", async () => {
    const { service, txQuery } = build();
    await service.record("u-1", { feeling: null, worseText: null }, LONDON_Q2_START);
    await service.record("u-1", { feeling: "about_the_same", worseText: "   " }, LONDON_Q2_START);
    expect(txQuery.mock.calls.map((c) => (c[1] as unknown[]).slice(2))).toEqual([
      [null, null],
      ["about_the_same", null],
    ]);
  });

  it("answers recorded:false when the insert did nothing (a repeat, or switched off)", async () => {
    const { service } = build({ inserted: [] });
    expect(
      await service.record("u-1", { feeling: null, worseText: null }, LONDON_Q2_START),
    ).toEqual({ recorded: false });
  });

  it("records nothing while paused", async () => {
    const { service, transaction } = build({ paused: "true" });
    expect(
      await service.record("u-1", { feeling: "more_in_control", worseText: null }, LONDON_Q2_START),
    ).toEqual({ recorded: false });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rejects bad bodies with a 400 that never carries the text, and writes nothing", async () => {
    const { service, transaction } = build();
    const bad: unknown[] = [
      { feeling: "fine", worseText: SENTINEL },
      { feeling: null, worseText: `${SENTINEL}${"x".repeat(1000)}` },
      { feeling: null, worseText: SENTINEL, extra: SENTINEL },
      { feeling: null },
      null,
    ];
    for (const body of bad) {
      const error = await service.record("u-1", body, LONDON_Q2_START).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect(JSON.stringify((error as BadRequestException).getResponse())).not.toContain("lost");
      expect((error as Error).message).not.toContain("lost");
    }
    expect(transaction).not.toHaveBeenCalled();
  });

  it("logs nothing, so the text cannot reach a log line", async () => {
    const spies = (["log", "warn", "error", "debug", "verbose"] as const).map((level) =>
      vi.spyOn(Logger.prototype, level).mockImplementation(() => undefined),
    );
    const staticSpies = (["log", "warn", "error", "debug", "verbose"] as const).map((level) =>
      vi.spyOn(Logger, level).mockImplementation(() => undefined),
    );
    const consoleSpies = (["log", "info", "warn", "error", "debug"] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => undefined),
    );
    const { service } = build();
    await service.record("u-1", { feeling: "more_worried", worseText: SENTINEL }, LONDON_Q2_START);
    await service
      .record("u-1", { feeling: "nope", worseText: SENTINEL }, LONDON_Q2_START)
      .catch(() => undefined);
    for (const spy of [...spies, ...staticSpies, ...consoleSpies]) {
      expect(spy).not.toHaveBeenCalled();
    }
  });
});
