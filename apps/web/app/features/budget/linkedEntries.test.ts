import { describe, expect, it } from "vitest";
import {
  isNotSetEntry,
  linkedAccountFor,
  linkedSourceText,
  notSetActionFor,
} from "./linkedEntries";

describe("notSetActionFor", () => {
  it("sends a take-home that is not set to the salary in Profile", () => {
    expect(notSetActionFor({ linked: "take_home" }, null)).toEqual({
      to: "/app/profile#settings-age-and-pay",
      label: "Add your salary",
    });
  });

  it("sends a mortgage holder's housing line to the mortgage page", () => {
    expect(notSetActionFor({ linked: "housing" }, "mortgage")).toEqual({
      to: "/app/mortgage",
      label: "Add your mortgage payment",
    });
  });

  it("has no link for a rent, which is typed on the line itself", () => {
    expect(notSetActionFor({ linked: "housing" }, "renting")).toBeNull();
  });
});

describe("isNotSetEntry", () => {
  it("is true only for a linked line marked not set", () => {
    expect(isNotSetEntry({ notSet: true })).toBe(true);
    expect(isNotSetEntry({})).toBe(false);
  });
});

describe("savings and debt lines linked to an account (audit slice 5)", () => {
  const accounts = [
    { id: "saver", name: "Easy saver", type: "Saving" },
    { id: "loan", name: "Car loan", type: "Loan" },
    { id: "bank", name: "Bank", type: "Current" },
  ];

  it("finds the account a line reads only while it exists and still fits the line", () => {
    expect(linkedAccountFor({ linked: "savings", linkAccountId: "saver" }, accounts)?.name).toBe(
      "Easy saver",
    );
    expect(linkedAccountFor({ linked: "savings", linkAccountId: "gone" }, accounts)).toBeNull();
    expect(linkedAccountFor({ linked: "savings", linkAccountId: null }, accounts)).toBeNull();
    // The account became a current account, or a debt line names a savings account.
    expect(linkedAccountFor({ linked: "savings", linkAccountId: "bank" }, accounts)).toBeNull();
    expect(linkedAccountFor({ linked: "debt", linkAccountId: "saver" }, accounts)).toBeNull();
  });

  it("sends a line with no saved amount to the account's page, and a line whose account is gone nowhere", () => {
    expect(notSetActionFor({ linked: "savings", linkAccountId: "saver" }, null, accounts)).toEqual({
      to: "/app/savings",
      label: "Add the monthly saving",
    });
    expect(notSetActionFor({ linked: "debt", linkAccountId: "loan" }, null, accounts)).toEqual({
      to: "/app/debt",
      label: "Add the monthly payment",
    });
    expect(notSetActionFor({ linked: "debt", linkAccountId: null }, null, accounts)).toBeNull();
  });

  it("says where the figure comes from, or why there is none", () => {
    expect(linkedSourceText({ linked: "savings", linkAccountId: "saver" }, accounts)).toBe(
      "From Easy saver",
    );
    expect(
      linkedSourceText({ linked: "debt", linkAccountId: "loan", notSet: true }, accounts),
    ).toBe("Linked to Car loan, which has no monthly payment saved");
    expect(
      linkedSourceText({ linked: "savings", linkAccountId: null, notSet: true }, accounts),
    ).toBe("The account this line used was removed or changed");
    expect(linkedSourceText({ linked: "take_home" }, accounts)).toBeUndefined();
  });
});
