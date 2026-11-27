// @vitest-environment node
import { describe, expect, it } from "vitest";
import { budgetEntryFromRow } from "./budget-rows.js";

describe("budgetEntryFromRow", () => {
  it("a missing or unreadable share is null; a stored one is read as a number", () => {
    expect(budgetEntryFromRow({ amount: 100 }).sharePercent).toBeNull();
    expect(budgetEntryFromRow({ amount: 100, sharePercent: "abc" }).sharePercent).toBeNull();
    expect(budgetEntryFromRow({ amount: 100, sharePercent: true }).sharePercent).toBeNull();
    expect(budgetEntryFromRow({ amount: 100, sharePercent: "40" }).sharePercent).toBe(40);
    expect(budgetEntryFromRow({ amount: 100, sharePercent: 60 }).sharePercent).toBe(60);
  });
});
