import { describe, expect, it } from "vitest";
import {
  isDefaultSectionOrder,
  moveSection,
  orderSections,
  resolveSectionOrder,
  SECTION_PRIORITY,
  selectSectionCards,
} from "./sectionOrder";

describe("sectionOrder", () => {
  it("draws all available sections in the default order when nothing is saved", () => {
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
    const order = resolveSectionOrder(["budget", "debt"]);
    const ticked = ["accounts", "budget", "debt", "pension", "tax"] as const;
    const rows = orderSections(["accounts", "budget", "debt", "savings", "pension", "tax"], order);
    const shown = selectSectionCards([...ticked], order);
    expect(shown).toEqual(rows.filter((k) => (ticked as readonly string[]).includes(k)));
  });
});

describe("resolveSectionOrder", () => {
  it("is the default order when nothing is saved", () => {
    expect(resolveSectionOrder(null)).toEqual([...SECTION_PRIORITY]);
    expect(resolveSectionOrder(undefined)).toEqual([...SECTION_PRIORITY]);
    expect(resolveSectionOrder([])).toEqual([...SECTION_PRIORITY]);
  });

  it("keeps the saved order and puts sections it does not name at the end, in default order", () => {
    // Saved: budget, pension. The rest follow in SECTION_PRIORITY order: debt, mortgage,
    // savings, tax, accounts.
    expect(resolveSectionOrder(["budget", "pension"])).toEqual([
      "budget",
      "pension",
      "debt",
      "mortgage",
      "savings",
      "tax",
      "accounts",
    ]);
  });

  it("drops unknown, retired and repeated keys", () => {
    expect(resolveSectionOrder(["forecast", "tax", "retirement", "tax", "debt"])).toEqual([
      "tax",
      "debt",
      "mortgage",
      "savings",
      "pension",
      "budget",
      "accounts",
    ]);
  });

  it("orders cards by the saved order", () => {
    const order = resolveSectionOrder(["accounts", "tax"]);
    expect(selectSectionCards(["debt", "tax", "accounts", "budget"], order)).toEqual([
      "accounts",
      "tax",
      "debt",
      "budget",
    ]);
  });
});

describe("moveSection", () => {
  const order = [...SECTION_PRIORITY];

  it("moves a section one place up or down", () => {
    expect(moveSection(order, "mortgage", -1).slice(0, 3)).toEqual(["mortgage", "debt", "savings"]);
    expect(moveSection(order, "mortgage", 1).slice(0, 3)).toEqual(["debt", "savings", "mortgage"]);
  });

  it("leaves the order alone at either end", () => {
    expect(moveSection(order, "debt", -1)).toEqual(order);
    expect(moveSection(order, "accounts", 1)).toEqual(order);
  });

  it("does not change the order it was given", () => {
    const before = [...order];
    moveSection(order, "tax", -1);
    expect(order).toEqual(before);
  });

  it("can tell the default order", () => {
    expect(isDefaultSectionOrder(order)).toBe(true);
    expect(isDefaultSectionOrder(moveSection(order, "tax", -1))).toBe(false);
  });
});
