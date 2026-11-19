import { describe, expect, it } from "vitest";
import {
  BUY_TO_LET_PROPERTY_LABEL,
  isBuyToLetAccount,
  isBuyToLetAccountName,
} from "./buy-to-let.js";

describe("isBuyToLetAccountName", () => {
  it("knows buy to let with spaces, hyphens, no gap or several spaces, and BTL", () => {
    expect(isBuyToLetAccountName("Buy to let flat")).toBe(true);
    expect(isBuyToLetAccountName("Buy-to-let flat")).toBe(true);
    expect(isBuyToLetAccountName("BuyToLet flat")).toBe(true);
    expect(isBuyToLetAccountName("Buy to  let")).toBe(true);
    expect(isBuyToLetAccountName("BTL mortgage")).toBe(true);
  });

  it("does not match other names", () => {
    expect(isBuyToLetAccountName("Home")).toBe(false);
    expect(isBuyToLetAccountName("Subtle flat")).toBe(false);
  });
});

describe("BUY_TO_LET_PROPERTY_LABEL", () => {
  it("is a name the buy-to-let name rule recognises", () => {
    // A rental saved under the default name must still read as buy to let by name.
    expect(isBuyToLetAccountName(BUY_TO_LET_PROPERTY_LABEL)).toBe(true);
  });
});

describe("isBuyToLetAccount", () => {
  it("lets a saved kind decide over the name", () => {
    expect(isBuyToLetAccount({ name: "Home", accountSubtype: "rental" })).toBe(true);
    expect(isBuyToLetAccount({ name: "Home", accountSubtype: "btl_mortgage" })).toBe(true);
    expect(isBuyToLetAccount({ name: "BTL flat", accountSubtype: "home" })).toBe(false);
    expect(isBuyToLetAccount({ name: "BTL loan", accountSubtype: "residential_mortgage" })).toBe(
      false,
    );
  });

  it("falls back to the name when no kind is saved", () => {
    expect(isBuyToLetAccount({ name: "Buy-to-let flat" })).toBe(true);
    expect(isBuyToLetAccount({ name: null })).toBe(false);
  });
});
