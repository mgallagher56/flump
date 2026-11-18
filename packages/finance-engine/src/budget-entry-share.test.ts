import { describe, expect, it } from "vitest";
import { applyBudgetEntryShare, resolveBudgetEntrySharePercent } from "./budget-entry-share.js";

describe("resolveBudgetEntrySharePercent (E34 C1)", () => {
  it("is 100 for a sole entry or one saved before the marker existed", () => {
    expect(resolveBudgetEntrySharePercent({})).toBe(100);
    expect(resolveBudgetEntrySharePercent({ ownership: "sole", sharePercent: 40 })).toBe(100);
  });

  it("is the saved share of a joint entry, or 50 without one (the accounts rule)", () => {
    expect(resolveBudgetEntrySharePercent({ ownership: "joint", sharePercent: 40 })).toBe(40);
    expect(resolveBudgetEntrySharePercent({ ownership: "joint", sharePercent: null })).toBe(50);
    expect(resolveBudgetEntrySharePercent({ ownership: "joint" })).toBe(50);
  });

  it("never reads the entry name, so a joint 'ISA / Investments' saving still splits", () => {
    // Accounts named ISA cannot be joint; budget entries have no such rule.
    const entry = { name: "ISA / Investments", ownership: "joint", sharePercent: 50 };
    expect(resolveBudgetEntrySharePercent(entry)).toBe(50);
  });
});

describe("applyBudgetEntryShare", () => {
  it("scales an amount by the share, to the penny", () => {
    // £1,200 rent, joint at 50%: £600 is mine.
    expect(applyBudgetEntryShare(1200, { ownership: "joint" })).toBe(600);
    // £99.99 energy at 30%: 29.997, rounded to £30.00.
    expect(applyBudgetEntryShare(99.99, { ownership: "joint", sharePercent: 30 })).toBe(30);
    expect(applyBudgetEntryShare(1200, { ownership: "sole" })).toBe(1200);
  });
});
