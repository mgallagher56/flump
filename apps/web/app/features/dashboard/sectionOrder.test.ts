import { describe, expect, it } from "vitest";
import { MAX_SECTION_CARDS, orderSections, selectSectionCards } from "./sectionOrder";

describe("sectionOrder", () => {
  it("draws the first four available sections in the one section order", () => {
    expect(
      selectSectionCards(["accounts", "budget", "debt", "savings", "pension", "mortgage"]),
    ).toEqual(["debt", "mortgage", "savings", "pension"]);
    expect(selectSectionCards(["accounts", "budget", "tax"])).toEqual([
      "tax",
      "budget",
      "accounts",
    ]);
    expect(MAX_SECTION_CARDS).toBe(4);
  });

  it("orders the panel's rows the same way the cards are drawn", () => {
    const ticked = ["accounts", "budget", "debt", "pension", "tax"] as const;
    const rows = orderSections(["accounts", "budget", "debt", "savings", "pension", "tax"]);
    const shown = selectSectionCards([...ticked]);
    // "Up to 4, in this order": the shown sections are the first four ticked rows.
    expect(shown).toEqual(
      rows.filter((k) => (ticked as readonly string[]).includes(k)).slice(0, 4),
    );
  });
});
