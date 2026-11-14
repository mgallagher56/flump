import { describe, expect, it } from "vitest";
import { EXISTING_ACCOUNTS, PREVIEW_ACCOUNTS, PREVIEW_ROWS } from "./fixtures";
import {
  commitPlan,
  daysLeft,
  groupByMonth,
  initialAccountMap,
  monthRange,
  overwriteKeys,
  takenAccountIds,
} from "./importModel";

const SAVER = EXISTING_ACCOUNTS[1]?.id as string;

describe("importModel", () => {
  it("starts each staged account on its mapping or suggestion, never one account twice", () => {
    expect(initialAccountMap(PREVIEW_ACCOUNTS)).toEqual({ saver: SAVER, isa: null });
    const twice = [
      { ...PREVIEW_ACCOUNTS[0], ref: "a", mappedAccountId: null },
      { ...PREVIEW_ACCOUNTS[0], ref: "b", mappedAccountId: null },
    ] as typeof PREVIEW_ACCOUNTS;
    expect(initialAccountMap(twice)).toEqual({ a: SAVER, b: null });
  });

  it("lists accounts taken by other refs only", () => {
    expect([...takenAccountIds({ saver: SAVER, isa: null }, "isa")]).toEqual([SAVER]);
    expect(takenAccountIds({ saver: SAVER }, "saver").size).toBe(0);
  });

  it("keeps flagged rows unless ticked, and sends only flagged keys", () => {
    expect(commitPlan(PREVIEW_ROWS, new Set())).toEqual({
      new: 3,
      overwrite: 1,
      unchanged: 1,
      kept: 1,
    });
    const ticked = new Set(["saver:2026-09", "isa:2026-08"]);
    expect(commitPlan(PREVIEW_ROWS, ticked)).toEqual({
      new: 3,
      overwrite: 2,
      unchanged: 1,
      kept: 0,
    });
    expect(overwriteKeys(PREVIEW_ROWS, ticked)).toEqual(["saver:2026-09"]);
  });

  it("groups by month, newest first, in staged account order", () => {
    const groups = groupByMonth(PREVIEW_ROWS, PREVIEW_ACCOUNTS);
    expect(groups.map((g) => g.month)).toEqual(["2026-10", "2026-09", "2026-08"]);
    expect(groups[0]?.rows.map((r) => r.ref)).toEqual(["saver", "isa"]);
  });

  it("reports the month range and days left", () => {
    expect(monthRange(PREVIEW_ROWS)).toEqual({ from: "2026-08", to: "2026-10" });
    expect(monthRange([])).toBeNull();
    const now = new Date("2026-11-14T10:00:00Z");
    expect(daysLeft("2026-11-20T10:00:00Z", now)).toBe(6);
    expect(daysLeft("2026-11-01T10:00:00Z", now)).toBe(0);
  });
});
