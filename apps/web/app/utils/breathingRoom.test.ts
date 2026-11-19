// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  BREATHING_ROOM_DESCRIPTION,
  BREATHING_ROOM_LABEL,
  breathingRoomPhrase,
  describeBreathingRoom,
  formatMonthsOfCover,
} from "./breathingRoom";

describe("breathing room wording", () => {
  it("keeps the owner's fixed label and description", () => {
    expect(BREATHING_ROOM_LABEL).toBe("Breathing room");
    expect(BREATHING_ROOM_DESCRIPTION).toBe("How long your savings would cover the essentials.");
  });

  it("formats months and long stretches in plain words", () => {
    expect(formatMonthsOfCover(1)).toBe("1 month");
    // Rounds to "1" before choosing the plural: never "1 months".
    expect(formatMonthsOfCover(1.04)).toBe("1 month");
    expect(formatMonthsOfCover(0.96)).toBe("1 month");
    expect(breathingRoomPhrase(1.04)).toBe("about 1 month");
    expect(formatMonthsOfCover(4.74)).toBe("4.7 months");
    expect(formatMonthsOfCover(130)).toBe("10+ years");
    expect(formatMonthsOfCover(-2)).toBe("0 months");
  });

  it("leads with About, or More than for over ten years", () => {
    expect(describeBreathingRoom(1.5)).toEqual({ leadIn: "About", figure: "1.5 months" });
    expect(describeBreathingRoom(130)).toEqual({ leadIn: "More than", figure: "10 years" });
  });

  it("words the dashboard line's phrase in lower case", () => {
    expect(breathingRoomPhrase(1.5)).toBe("about 1.5 months");
    expect(breathingRoomPhrase(1)).toBe("about 1 month");
    expect(breathingRoomPhrase(130)).toBe("more than 10 years");
  });
});
