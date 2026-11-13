import { describe, expect, it } from "vitest";
import {
  formatSignedChange,
  netWorthChangeSentence,
  SAVE_ERROR_TOAST,
  savedToast,
  spokenChange,
  statusText,
} from "./snapshotCopy";

describe("snapshot copy", () => {
  it("formats changes with a sign and a true minus", () => {
    expect(formatSignedChange(1200)).toBe("+£1,200");
    expect(formatSignedChange(-300.4)).toBe("−£300");
    expect(formatSignedChange(0.2)).toBe("£0");
  });

  it("words a change the same whether it went up or down (advice policy R1)", () => {
    const up = netWorthChangeSentence(500, "2026-10");
    const down = netWorthChangeSentence(-500, "2026-10");
    expect(up).toBe("Net worth changed by +£500 since October 2026.");
    expect(down.replace("−", "+")).toBe(up);
    expect(spokenChange(500)).toBe("up £500");
    expect(spokenChange(-500)).toBe("down £500");
    expect(spokenChange(0)).toBe("no change");
  });

  it("confirms a full save and explains a partial one without judging it", () => {
    expect(savedToast("2026-11", 4, 0)).toEqual({ title: "Balances saved for November 2026" });
    const partial = savedToast("2026-11", 1, 2);
    expect(partial.title).toBe("1 balance saved for November 2026");
    expect(partial.description).toMatch(/keep their earlier values/);
    expect(SAVE_ERROR_TOAST.title).not.toMatch(/!/);
  });

  it("describes account states with no overdue wording", () => {
    expect(statusText("notUpdated", "2026-11", "2026-09")).toBe("Not updated since September 2026");
    expect(statusText("recorded", "2026-11", "2026-11")).toBe("Recorded for November 2026");
    expect(statusText("connected", "2026-11", null)).toMatch(/updates from your bank/);
    for (const s of ["connected", "recorded", "notUpdated", "noHistory"] as const) {
      expect(statusText(s, "2026-11", "2026-10")).not.toMatch(/overdue|behind|missed|streak/i);
    }
  });
});
