import { ICON_TILE_DOMAIN_TONE } from "@repo/ui";
import { describe, expect, it } from "vitest";
import { SECTION_COLOURS, SECTION_TILE_TONE } from "./sectionColours";
import { SECTION_PRIORITY } from "./sectionOrder";

describe("SECTION_COLOURS", () => {
  it("gives every section its own colour", () => {
    const colours = SECTION_PRIORITY.map((key) => SECTION_COLOURS[key]);
    expect(new Set(colours).size).toBe(SECTION_PRIORITY.length);
  });

  it("keeps the colours debt, savings and mortgage already had", () => {
    expect(SECTION_COLOURS.debt).toBe("apricot");
    expect(SECTION_COLOURS.savings).toBe("sage");
    expect(SECTION_COLOURS.mortgage).toBe("teal");
  });

  it("is the same colour the section's pages use (one home per value)", () => {
    // Pension page tile is sky like its card; tax is violet; budget rose; accounts damson (accent).
    // Literal colours, so a change to the map has to be a deliberate edit here too.
    expect(SECTION_COLOURS.pension).toBe("sky");
    expect(SECTION_COLOURS.tax).toBe("violet");
    expect(SECTION_COLOURS.budget).toBe("rose");
    expect(SECTION_COLOURS.accounts).toBe("damson");
    expect(SECTION_COLOURS.retirement).toBe(SECTION_COLOURS.pension);
    expect(ICON_TILE_DOMAIN_TONE.pension).toBe(SECTION_TILE_TONE[SECTION_COLOURS.pension]);
    expect(ICON_TILE_DOMAIN_TONE.tax).toBe(SECTION_TILE_TONE[SECTION_COLOURS.tax]);
    expect(ICON_TILE_DOMAIN_TONE.budget).toBe(SECTION_TILE_TONE[SECTION_COLOURS.budget]);
    expect(ICON_TILE_DOMAIN_TONE.accounts).toBe(SECTION_TILE_TONE[SECTION_COLOURS.accounts]);
    expect(ICON_TILE_DOMAIN_TONE.mortgage).toBe(SECTION_TILE_TONE[SECTION_COLOURS.mortgage]);
    expect(ICON_TILE_DOMAIN_TONE.savings).toBe(SECTION_TILE_TONE[SECTION_COLOURS.savings]);
    expect(ICON_TILE_DOMAIN_TONE.debt).toBe(SECTION_TILE_TONE[SECTION_COLOURS.debt]);
  });

  it("never uses a status colour, so no colour reads as good or bad", () => {
    for (const key of SECTION_PRIORITY) {
      expect(SECTION_COLOURS[key]).not.toMatch(/danger|positive|warning|red|green|gold/);
    }
  });
});
