import { describe, expect, it } from "vitest";
import {
  BUDGET_INCOME_CATEGORY,
  BUDGET_SYNONYM_GROUPS,
  HOUSING_PAYMENT_NAMES,
  normaliseEntryName,
  TAKE_HOME_PAY_NAMES,
} from "./budget-entry-names";

/** The synonym group a typed name falls in, matched exactly on the normalised name. */
const groupOf = (name: string) => {
  const normalised = normaliseEntryName(name);
  return BUDGET_SYNONYM_GROUPS.find((group) => group.names.includes(normalised));
};

describe("normaliseEntryName", () => {
  it("lower-cases and trims", () => {
    expect(normaliseEntryName("  Council Tax  ")).toBe("council tax");
  });

  it("reads a slash as 'or' and an ampersand as 'and'", () => {
    // "/" becomes " or ", then the doubled spaces collapse to one.
    expect(normaliseEntryName("Rent / Mortgage")).toBe("rent or mortgage");
    expect(normaliseEntryName("Rent/Mortgage")).toBe("rent or mortgage");
    expect(normaliseEntryName("Gas & Electricity")).toBe("gas and electricity");
    expect(normaliseEntryName("Gas&Electricity")).toBe("gas and electricity");
  });

  it("leaves no trailing space when a name ends in a slash or ampersand", () => {
    // "Rent /" becomes "rent  or ", collapses to "rent or ", then the last trim gives "rent or".
    expect(normaliseEntryName("Rent /")).toBe("rent or");
    expect(normaliseEntryName("Gas &")).toBe("gas and");
  });

  it("collapses runs of spaces and tabs to one space", () => {
    expect(normaliseEntryName("water\t\t  bill")).toBe("water bill");
    expect(normaliseEntryName("food    shop")).toBe("food shop");
  });
});

describe("BUDGET_SYNONYM_GROUPS", () => {
  // Each name the wizard and the label rules recognise, with the category its group belongs to.
  const recognised: ReadonlyArray<[string, string]> = [
    ["Rent / Mortgage", "housing"],
    ["Rent", "housing"],
    ["Mortgage", "housing"],
    ["Rent payment", "housing"],
    ["Mortgage payment", "housing"],
    ["Household contribution", "housing"],
    ["Gas & Electricity", "bills"],
    ["Gas", "bills"],
    ["Electricity", "bills"],
    ["Energy", "bills"],
    ["Energy bill", "bills"],
    ["Broadband", "bills"],
    ["Phone & Broadband", "bills"],
    ["Broadband and phone", "bills"],
    ["Internet", "bills"],
    ["Wi-Fi", "bills"],
    ["WiFi", "bills"],
    ["Groceries", "expenses"],
    ["Food shop", "expenses"],
    ["Food", "expenses"],
    ["Food shopping", "expenses"],
    ["Supermarket", "expenses"],
    ["Council tax", "bills"],
    ["Council tax bill", "bills"],
    ["Water", "bills"],
    ["Water bill", "bills"],
    ["Water rates", "bills"],
    ["Savings", "savings"],
    ["Emergency fund", "savings"],
    ["ISA / Investments", "savings"],
    ["Take-home pay", "income"],
    ["Salary", "income"],
    ["Salary after tax", "income"],
    ["Wages", "income"],
    ["Monthly take-home income", "income"],
    ["Income", "income"],
    ["Net income", "income"],
    ["Monthly income", "income"],
    ["Take-home", "income"],
    ["Take home pay", "income"],
  ];

  it.each(recognised)("recognises %s as a %s entry", (name, category) => {
    expect(groupOf(name)?.category).toBe(category);
  });

  it("puts names of the same entry in the same group", () => {
    expect(groupOf("Gas")).toBe(groupOf("Electricity"));
    expect(groupOf("Wifi")).toBe(groupOf("Broadband"));
    expect(groupOf("Water")).not.toBe(groupOf("Council tax"));
    expect(groupOf("Rent")).not.toBe(groupOf("Salary"));
  });

  it("does not read a longer name as one of the entries", () => {
    expect(groupOf("Rent for parking")).toBeUndefined();
    expect(groupOf("Water softener")).toBeUndefined();
    expect(groupOf("")).toBeUndefined();
  });

  it("files take-home pay names under the income category", () => {
    expect(BUDGET_INCOME_CATEGORY).toBe("income");
    expect(TAKE_HOME_PAY_NAMES).toContain("salary");
    expect(HOUSING_PAYMENT_NAMES).toContain("rent or mortgage");
  });
});
