import { describe, expect, it } from "vitest";
import { formatPayoffDuration } from "./payoffFormat";

describe("formatPayoffDuration", () => {
  it("reads months under 24 and years and months from 24", () => {
    expect(formatPayoffDuration(1)).toBe("1 month");
    expect(formatPayoffDuration(18)).toBe("18 months");
    expect(formatPayoffDuration(24)).toBe("2 years");
    expect(formatPayoffDuration(40)).toBe("3 years 4 months");
    expect(formatPayoffDuration(-3)).toBe("0 months");
  });
});
