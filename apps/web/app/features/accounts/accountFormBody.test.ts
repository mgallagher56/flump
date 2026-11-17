import { describe, expect, it } from "vitest";
import { accountFieldsFromForm } from "./accountFormBody";

const form = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
};

describe("accountFieldsFromForm", () => {
  it("sends nothing for fields the form left out", () => {
    expect(accountFieldsFromForm(form({ name: "Pot" }))).toEqual({});
  });

  it("clears an emptied subtype, credit limit and 0% date with null", () => {
    expect(
      accountFieldsFromForm(
        form({ accountSubtype: "", creditLimit: "", promoZeroPercentUntil: "", balance: "" }),
      ),
    ).toEqual({ accountSubtype: null, creditLimit: null, promoZeroPercentUntil: null });
  });

  it("reads joint ownership, the share and the new fields together", () => {
    expect(
      accountFieldsFromForm(
        form({
          ownership: "joint",
          sharePercent: "40",
          accountSubtype: "btl_mortgage",
          balance: "-150000.456",
          creditLimit: "2500.5",
          promoZeroPercentUntil: "2027-03-31",
        }),
      ),
    ).toEqual({
      ownership: "joint",
      sharePercent: 40,
      accountSubtype: "btl_mortgage",
      balance: -150000.46,
      creditLimit: 2500.5,
      promoZeroPercentUntil: "2027-03-31",
    });
  });

  it("sends a null share for a sole account", () => {
    expect(accountFieldsFromForm(form({ ownership: "sole", sharePercent: "40" }))).toEqual({
      ownership: "sole",
      sharePercent: null,
    });
  });
});
