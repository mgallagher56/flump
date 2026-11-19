// @vitest-environment node
import { describe, expect, it } from "vitest";
import { pickResidentialMortgage } from "./residentialMortgage";

const btl = {
  id: "b1",
  type: "Mortgage",
  name: "Flat 2 loan",
  accountSubtype: "btl_mortgage",
  interestRate: 5.9,
};
const home = { id: "h1", type: "Property", name: "Home", accountSubtype: "home" };

describe("pickResidentialMortgage", () => {
  it("never takes a buy-to-let mortgage, even when it comes first", () => {
    const resi = { id: "m1", type: "Mortgage", name: "Nationwide", interestRate: 4.2 };
    expect(pickResidentialMortgage([btl, resi])?.id).toBe("m1");
  });

  it("prefers the residential mortgage linked to the home", () => {
    const second = { id: "m2", type: "Mortgage", name: "Further advance", linkedAccountId: null };
    const linked = { id: "m1", type: "Mortgage", name: "Main", linkedAccountId: "h1" };
    expect(pickResidentialMortgage([second, linked, home])?.id).toBe("m1");
  });

  it("falls back to the first residential mortgage when none is linked", () => {
    const first = { id: "m1", type: "Mortgage", name: "Main" };
    const second = { id: "m2", type: "Mortgage", name: "Second" };
    expect(pickResidentialMortgage([first, second, home])?.id).toBe("m1");
  });

  it("is null with only a buy-to-let mortgage, or no accounts", () => {
    expect(pickResidentialMortgage([btl])).toBeNull();
    expect(pickResidentialMortgage(undefined)).toBeNull();
  });
});
