import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { SnapshotsService } from "./snapshots.service";

/**
 * `PUT /snapshots/:month` input checks, without a database (the writes themselves are pinned by
 * the integration specs). Every bad request is refused before the transaction starts, so nothing
 * is read or written.
 */
const NOW = new Date("2026-11-20T12:00:00.000Z");
const ACCOUNT = "00000000-0000-4000-8000-0000000000a1";

function build() {
  const manager = {
    find: vi.fn(async (): Promise<unknown[]> => []),
    query: vi.fn(async (): Promise<unknown[]> => []),
  };
  const dataSource = {
    transaction: vi.fn(async (work: (m: typeof manager) => Promise<unknown>) => work(manager)),
  };
  return { service: new SnapshotsService(dataSource as never), dataSource, manager };
}

async function refusal(values: unknown[]): Promise<{ error: unknown; started: boolean }> {
  const { service, dataSource } = build();
  const error = await service
    .upsertMonth("user-1", "2026-11", { values } as never, NOW)
    .then(() => null)
    .catch((e: unknown) => e);
  return { error, started: dataSource.transaction.mock.calls.length > 0 };
}

describe("SnapshotsService.upsertMonth input checks (E30)", () => {
  it("refuses a body whose values are not a list", async () => {
    const { service, dataSource } = build();
    const error = await service
      .upsertMonth("user-1", "2026-11", { values: "1000" } as never, NOW)
      .then(() => null)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as Error).message).toMatch(/array/);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it("refuses more than 200 values in one request", async () => {
    // 201 values, one over the limit of 200.
    const values = Array.from({ length: 201 }, (_, i) => ({
      accountId: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
      value: 1,
    }));
    const { error, started } = await refusal(values);
    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as Error).message).toMatch(/200/);
    expect(started).toBe(false);
  });

  it("refuses a value with no account id", async () => {
    for (const entry of [null, { value: 1 }, { accountId: "", value: 1 }]) {
      const { error, started } = await refusal([entry]);
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as Error).message).toMatch(/accountId/);
      expect(started).toBe(false);
    }
  });

  it("refuses the same account twice, whatever the letter case of its id", async () => {
    const { error, started } = await refusal([
      { accountId: ACCOUNT, value: 1 },
      { accountId: ACCOUNT.toUpperCase(), value: 2 },
    ]);
    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as Error).message).toMatch(/once/);
    expect(started).toBe(false);
  });

  it("refuses a value with more than two decimal places", async () => {
    // 10.123 has three decimal places; pounds are kept to the penny.
    const { error, started } = await refusal([{ accountId: ACCOUNT, value: 10.123 }]);
    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as Error).message).toMatch(/decimal/);
    expect(started).toBe(false);
  });

  it("refuses an as-of date that is not a real day, falls outside the month or is in the future", async () => {
    const cases: Array<[string, RegExp]> = [
      // November has 30 days.
      ["2026-11-31", /valid/],
      // The request is for November 2026; 31 October is in another month.
      ["2026-10-31", /inside the month/],
      // Today in London is 20 November 2026, so the 25th has not happened yet.
      ["2026-11-25", /future/],
    ];
    for (const [asOfDate, message] of cases) {
      const { error, started } = await refusal([{ accountId: ACCOUNT, value: 1, asOfDate }]);
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as Error).message).toMatch(message);
      expect(started).toBe(false);
    }
  });

  it("refuses a source the client may not set", async () => {
    // Only manual, confirmed and calculated may come from a client; agent is server-set (R2-5).
    const { error, started } = await refusal([{ accountId: ACCOUNT, value: 1, source: "agent" }]);
    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as Error).message).toMatch(/source/);
    expect(started).toBe(false);
  });

  it("answers 404 for an account id that is not a UUID, without looking it up or writing", async () => {
    const { service, manager } = build();
    const error = await service
      .upsertMonth("user-1", "2026-11", { values: [{ accountId: "not-a-uuid", value: 5 }] }, NOW)
      .then(() => null)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(NotFoundException);
    expect(manager.find).not.toHaveBeenCalled();
    expect(manager.query).not.toHaveBeenCalled();
  });
});
