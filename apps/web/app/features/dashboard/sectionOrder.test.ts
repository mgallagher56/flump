import { describe, expect, it } from "vitest";
import { orderSections, selectSectionCards } from "./sectionOrder";

describe("sectionOrder", () => {
  it("draws all available sections in the one section order", () => {
    expect(
      selectSectionCards(["accounts", "budget", "debt", "savings", "pension", "mortgage"]),
    ).toEqual(["debt", "mortgage", "savings", "pension", "budget", "accounts"]);
    expect(selectSectionCards(["accounts", "budget", "tax"])).toEqual([
      "tax",
      "budget",
      "accounts",
    ]);
  });

  it("orders the panel's rows the same way the cards are drawn", () => {
    const ticked = ["accounts", "budget", "debt", "pension", "tax"] as const;
    const rows = orderSections(["accounts", "budget", "debt", "savings", "pension", "tax"]);
    const shown = selectSectionCards([...ticked]);
    expect(shown).toEqual(rows.filter((k) => (ticked as readonly string[]).includes(k)));
  });
});
