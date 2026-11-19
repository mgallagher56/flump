import { describe, expect, it } from "vitest";
import { propertyPrefillFor } from "./propertyPrefill";

const mortgage = (fields: Record<string, unknown>) => ({
  id: "m1",
  type: "Mortgage",
  name: "Mortgage",
  updatedAt: "2026-01-05T10:00:00.000Z",
  ...fields,
});

describe("propertyPrefillFor", () => {
  it("adds a home held solely, linked to nothing, when there is no mortgage", () => {
    expect(propertyPrefillFor([])).toEqual({
      name: "Home (your estimate)",
      subtype: "home",
      ownership: "sole",
      sharePercent: null,
    });
  });

  it("suggests the one unlinked mortgage's ownership and share, and links to it", () => {
    expect(propertyPrefillFor([mortgage({ ownership: "joint", sharePercent: 40 })])).toEqual({
      name: "Home (your estimate)",
      subtype: "home",
      ownership: "joint",
      sharePercent: 40,
      linkMortgage: { id: "m1", updatedAt: "2026-01-05T10:00:00.000Z" },
    });
  });

  it("adds a rental for a buy-to-let mortgage when no residential one needs a property", () => {
    const prefill = propertyPrefillFor([mortgage({ accountSubtype: "btl_mortgage" })]);
    expect(prefill).toMatchObject({
      name: "Buy-to-let property",
      subtype: "rental",
      linkMortgage: { id: "m1" },
    });
  });

  it("prefers the residential mortgage, and skips one already linked", () => {
    const prefill = propertyPrefillFor([
      mortgage({ id: "btl", accountSubtype: "btl_mortgage" }),
      mortgage({ id: "res", accountSubtype: "residential_mortgage" }),
      mortgage({ id: "done", linkedAccountId: "h1" }),
    ]);
    expect(prefill).toMatchObject({ subtype: "home", linkMortgage: { id: "res" } });
  });

  it("links to nothing when two mortgages could be it", () => {
    const prefill = propertyPrefillFor([mortgage({ id: "a" }), mortgage({ id: "b" })]);
    expect(prefill.linkMortgage).toBeUndefined();
    expect(prefill.ownership).toBe("sole");
  });
});
