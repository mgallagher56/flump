import { describe, expect, it } from "vitest";
import {
  CHECK_IN_COPY,
  checkInMoney,
  checkInNetWorthText,
  checkInProgress,
  checkInSavedText,
  doneText,
  formatSignedChange,
  lastFigureText,
  netWorthChangeSentence,
  noBalancesChangedText,
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

describe("check-in copy", () => {
  it("states the saved current balance that No change keeps, or no figure", () => {
    expect(lastFigureText(3360)).toBe("Current balance: £3,360");
    expect(lastFigureText(3412.5)).toBe("Current balance: £3,412.50");
    expect(lastFigureText(null)).toBe("No balance recorded yet");
  });

  it("words a done step as a plain status", () => {
    expect(doneText("updated", 3400)).toBe("Updated £3,400");
    expect(doneText("noChange", 3400)).toBe("No change");
    expect(doneText("calculated", 185447.4)).toBe("Calculated £185,447");
    expect(checkInProgress(3, 8)).toBe("3 of 8");
    expect(checkInMoney(-250)).toBe("−£250");
  });

  it("states net worth against last month the same way in both directions", () => {
    expect(checkInSavedText("2026-11")).toBe("Check-in saved for November 2026.");
    expect(checkInNetWorthText(231400, 1250, "2026-10")).toBe(
      "Net worth: £231,400, up £1,250 on October 2026.",
    );
    expect(checkInNetWorthText(231400, -1250, "2026-10")).toBe(
      "Net worth: £231,400, down £1,250 on October 2026.",
    );
    expect(checkInNetWorthText(231400, 0.3, "2026-10")).toBe(
      "Net worth: £231,400, the same as October 2026.",
    );
    expect(checkInNetWorthText(-4200, null, "2026-10")).toBe("Net worth: −£4,200.");
    expect(noBalancesChangedText("2026-10")).toBe("No balances changed since October 2026.");
  });

  it("uses no verdict words, exclamation marks, em dashes or ampersands", () => {
    const all = [
      ...Object.values(CHECK_IN_COPY),
      checkInSavedText("2026-11"),
      checkInNetWorthText(1000, 50, "2026-10"),
      checkInNetWorthText(1000, -50, "2026-10"),
    ].join(" ");
    expect(all).not.toMatch(/well done|great|good|bad|only|just|congrat|behind|overdue/i);
    expect(all).not.toMatch(/[!—&]/);
  });
});
