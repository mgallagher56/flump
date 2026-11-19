import { describe, expect, it } from "vitest";
import {
  breathingRoomPhrase,
  breathingRoomValue,
  describeBreathingRoom,
  formatBreathingRoomFigure,
} from "./breathing-room-wording.js";

describe("breathingRoomValue (owner rulings 15 and 18 November 2026)", () => {
  it.each([
    // Under a year: one decimal place, the plural following the figure as shown.
    [0, "About 0 months"],
    [0.5, "About 0.5 months"],
    [1, "About 1 month"],
    // 1.04 shows as 1 to one decimal place, so "1 month".
    [1.04, "About 1 month"],
    [11.4, "About 11.4 months"],
    // 11.96 rounds to 12.0 at one decimal place, so it is a year, never "About 12 months".
    [11.96, "About 1 year"],
    [12, "About 1 year"],
    // Whole months, half up: 12.4 is 12 months, 12.5 is 13 months = 1 year 1 month.
    [12.4, "About 1 year"],
    [12.5, "About 1 year 1 month"],
    [13, "About 1 year 1 month"],
    // 23.6 rounds to 24 months = 2 years, with no "0 months".
    [23.6, "About 2 years"],
    [24, "About 2 years"],
    // 27 months = 2 years 3 months.
    [27, "About 2 years 3 months"],
    // 120 months = 10 years, the last figure before the cap.
    [120, "About 10 years"],
    // Above the cap: floor(121 / 12) = 10.
    [121, "More than 10 years"],
  ])("%s months reads %s", (months, expected) => {
    expect(breathingRoomValue(months)).toBe(expected);
  });

  it("says Not set for an unknown figure, never 0", () => {
    expect(breathingRoomValue(null)).toBe("Not set");
    expect(breathingRoomValue(undefined)).toBe("Not set");
    expect(breathingRoomValue(Number.NaN)).toBe("Not set");
    expect(describeBreathingRoom(null)).toBeNull();
  });

  it("treats a negative figure as 0 months", () => {
    expect(breathingRoomValue(-2)).toBe("About 0 months");
  });
});

describe("the other forms", () => {
  it("splits the lead-in from the figure for a result block", () => {
    expect(describeBreathingRoom(13)).toEqual({ leadIn: "About", figure: "1 year 1 month" });
    expect(describeBreathingRoom(150)).toEqual({ leadIn: "More than", figure: "12 years" });
  });

  it("gives the figure alone, with the cap as N+ years", () => {
    expect(formatBreathingRoomFigure(4.7)).toBe("4.7 months");
    expect(formatBreathingRoomFigure(13)).toBe("1 year 1 month");
    expect(formatBreathingRoomFigure(150)).toBe("12+ years");
    expect(formatBreathingRoomFigure(null)).toBe("Not set");
  });

  it("lower-cases the lead-in inside a sentence", () => {
    expect(breathingRoomPhrase(1.5)).toBe("about 1.5 months");
    expect(breathingRoomPhrase(24)).toBe("about 2 years");
    expect(breathingRoomPhrase(130)).toBe("more than 10 years");
  });
});
