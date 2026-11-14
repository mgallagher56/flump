import { describe, expect, it } from "vitest";
import { PREVIEW_ROWS } from "./fixtures";
import {
  commitButtonLabel,
  expiryLine,
  planSentence,
  replaceLabel,
  reviewDescription,
  savedSentence,
  undoneSentence,
} from "./importCopy";

describe("importCopy", () => {
  it("describes the batch factually", () => {
    expect(reviewDescription(6, 2, { from: "2026-08", to: "2026-10" })).toBe(
      "6 monthly balances for 2 accounts, August 2026 to October 2026. Nothing is saved until you confirm.",
    );
    expect(reviewDescription(1, 1, { from: "2026-08", to: "2026-08" })).toBe(
      "1 monthly balance for 1 account, August 2026. Nothing is saved until you confirm.",
    );
    expect(expiryLine(1)).toBe("This import expires in 1 day.");
    expect(expiryLine(0)).toBe("This import expires today.");
  });

  it("names where a replaced value came from", () => {
    const manual = PREVIEW_ROWS[1];
    if (!manual) throw new Error("fixture");
    expect(replaceLabel(manual, "£4,300.00")).toBe("Replace the value you entered (£4,300.00)");
    expect(replaceLabel({ ...manual, priorSource: "connected" }, "£1.00")).toBe(
      "Replace the value from your bank (£1.00)",
    );
    expect(replaceLabel({ ...manual, prior: null }, null)).toBe(
      "Record this value instead of this month's bank balance",
    );
  });

  it("summarises the plan and the outcome", () => {
    expect(planSentence({ new: 3, overwrite: 1, unchanged: 1, kept: 1 })).toBe(
      "3 new balances, 1 replaced, 1 unchanged, 1 skipped.",
    );
    expect(commitButtonLabel(0)).toBe("Nothing to save");
    expect(commitButtonLabel(4)).toBe("Save 4 monthly balances");
    expect(savedSentence({ new: 1, overwrite: 0, unchanged: 0, skipped: 0 })).toBe(
      "1 new balance saved, 0 replaced, 0 unchanged.",
    );
    expect(undoneSentence({ restored: 1, removed: 2, kept: 1 })).toBe(
      "Import undone: 1 restored, 2 removed, 1 left as they are now.",
    );
  });
});
