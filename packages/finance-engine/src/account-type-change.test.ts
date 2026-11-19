import { describe, expect, it } from "vitest";
import {
  DEBT_ACCOUNT_TYPES,
  OVERDRAWABLE_ACCOUNT_TYPES,
  typeChangeFlipsSign,
} from "./account-type-change";

describe("typeChangeFlipsSign", () => {
  it("flips the sign when a debt moves to an asset type that cannot be overdrawn", () => {
    // Rule (CH-4): debt to Saving, Investment, Pension, Property or Owed is money held.
    for (const newType of ["Saving", "Investment", "Pension", "Property", "Owed"]) {
      expect(typeChangeFlipsSign("Credit Card", newType)).toBe(true);
    }
    for (const previousType of DEBT_ACCOUNT_TYPES) {
      expect(typeChangeFlipsSign(previousType, "Saving")).toBe(true);
    }
  });

  it("keeps the sign when a debt moves to a current account", () => {
    // Rule: an overdraft, card or loan moved to Current is an overdrawn current account.
    expect(typeChangeFlipsSign("Overdraft", "Current")).toBe(false);
    expect(typeChangeFlipsSign("Loan", "Current")).toBe(false);
  });

  it("keeps the sign when a debt moves to another debt type", () => {
    expect(typeChangeFlipsSign("Loan", "Credit Card")).toBe(false);
    expect(typeChangeFlipsSign("Mortgage", "Student Loan")).toBe(false);
  });

  it("keeps the sign for any move that starts from an asset type", () => {
    expect(typeChangeFlipsSign("Current", "Saving")).toBe(false);
    expect(typeChangeFlipsSign("Saving", "Credit Card")).toBe(false);
    expect(typeChangeFlipsSign("Investment", "Pension")).toBe(false);
  });

  it("keeps the sign when either type is missing", () => {
    expect(typeChangeFlipsSign(null, "Saving")).toBe(false);
    expect(typeChangeFlipsSign(undefined, "Saving")).toBe(false);
    expect(typeChangeFlipsSign("Credit Card", null)).toBe(false);
    expect(typeChangeFlipsSign("Credit Card", undefined)).toBe(false);
    expect(typeChangeFlipsSign(null, null)).toBe(false);
  });

  it("lists Current as the only overdrawable asset type", () => {
    expect([...OVERDRAWABLE_ACCOUNT_TYPES]).toEqual(["Current"]);
  });
});
