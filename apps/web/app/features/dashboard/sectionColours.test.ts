import { describe, expect, it } from "vitest";
import { SECTION_COLOURS } from "./sectionColours";
import { SECTION_PRIORITY } from "./sectionOrder";

describe("SECTION_COLOURS", () => {
  it("gives every section its own colour", () => {
    const colours = SECTION_PRIORITY.map((key) => SECTION_COLOURS[key]);
    expect(new Set(colours).size).toBe(SECTION_PRIORITY.length);
  });

  it("keeps the colours the money domains already use elsewhere (E16 P9.3)", () => {
    expect(SECTION_COLOURS.debt).toBe("apricot");
    expect(SECTION_COLOURS.savings).toBe("sage");
    expect(SECTION_COLOURS.mortgage).toBe("teal");
  });

  it("never uses a status colour, so no colour reads as good or bad", () => {
    for (const key of SECTION_PRIORITY) {
      expect(SECTION_COLOURS[key]).not.toMatch(/danger|positive|warning|red|green|gold/);
    }
  });
});
