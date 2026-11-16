import { describe, expect, it } from "vitest";
import {
  CHECK_IN_COPY,
  checkInChangeText,
  checkInMoney,
  checkInNetWorthChange,
  checkInProgress,
  checkInWholeTotal,
  doneText,
  formatSignedChange,
  formatWarmConfirmation,
  lastFigureText,
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
    expect(CHECK_IN_COPY.saved).toBe("Check-in saved");
    expect(checkInWholeTotal(231400.4)).toBe("£231,400");
    expect(checkInWholeTotal(-4200)).toBe("−£4,200");
    expect(checkInNetWorthChange(1250, "2026-10")).toBe("Up £1,250 on October 2026.");
    expect(checkInNetWorthChange(-1250, "2026-10")).toBe("Down £1,250 on October 2026.");
    expect(checkInNetWorthChange(0.3, "2026-10")).toBe("The same as October 2026.");
    expect(checkInNetWorthChange(null, "2026-10")).toBeNull();
  });

  it("states each change from the old figure to the new one in whole pounds", () => {
    expect(checkInChangeText(3400, 3450.6)).toBe("£3,400 to £3,451");
    expect(checkInChangeText(null, 3450)).toBe("£3,450");
  });

  it("uses no verdict words, exclamation marks, em dashes or ampersands", () => {
    const all = [
      ...Object.values(CHECK_IN_COPY),
      checkInNetWorthChange(50, "2026-10"),
      checkInNetWorthChange(-50, "2026-10"),
    ].join(" ");
    expect(all).not.toMatch(/well done|great|good|bad|only|just|congrat|behind|overdue/i);
    expect(all).not.toMatch(/[!—&]/);
  });

  it("formats E35 Set 1 warm confirmations with identical wording regardless of direction or starting point", () => {
    expect(formatWarmConfirmation({ kind: "checkInFinished", month: "2026-11" })).toBe(
      "November is checked in.",
    );
    const up = formatWarmConfirmation({
      kind: "checkInFinished",
      month: "2026-11",
      change: 1150,
      previousMonth: "2026-10",
    });
    const down = formatWarmConfirmation({
      kind: "checkInFinished",
      month: "2026-11",
      change: -1150,
      previousMonth: "2026-10",
    });
    expect(up).toBe("November is checked in. Net worth changed by +£1,150 since October 2026.");
    expect(down.replace("−", "+")).toBe(up);
    expect(formatWarmConfirmation({ kind: "setupStepFinished", step: "budget" })).toBe(
      "Budget added.",
    );
    expect(formatWarmConfirmation({ kind: "setupComplete" })).toBe(
      "Setup is finished. Everything on your dashboard now uses your own figures.",
    );
    expect(formatWarmConfirmation({ kind: "firstAccountAdded" })).toBe("Your first account is in.");
  });
});
