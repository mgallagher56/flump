import { describe, expect, it } from "vitest";
import { ALL_TAX_CATEGORIES, getCategoriesForSource } from "./tax-calculator.js";

/**
 * The category ids are a contract: tax records store them, and calculateUKTax adds a record up
 * only when its category id is one of its source's ids. The names are display copy, so these
 * tests check only that every category has one, not its wording.
 */
const RENTAL_IDS = [
  "rental_income",
  "rent_rates_insurance",
  "legal_management_fees",
  "repairs_maintenance",
  "replace_domestic_items",
  "services_costs",
  "mortgage_interest",
  // Finance costs not relieved in an earlier year and carried into this one (PR 807).
  "finance_costs_brought_forward",
];
const SELF_EMPLOYED_IDS = [
  "self_employed_income",
  "office_costs",
  "travel_costs",
  "clothing_costs",
  "staff_costs",
  "premises_costs",
  "legal_finance_fees",
  "advertising_marketing",
  "stock_raw_materials",
  "other_expenses",
];
const PAYE_IDS = ["paye_salary", "paye_bonus", "paye_benefit", "paye_pension"];
const SAVINGS_IDS = ["savings_interest", "dividend_income", "isa_interest", "investment_fees"];

const ids = (list: { id: string }[]) => list.map((c) => c.id);

describe("getCategoriesForSource", () => {
  it.each([
    ["rental", RENTAL_IDS],
    ["self-employed", SELF_EMPLOYED_IDS],
    ["paye", PAYE_IDS],
    ["savings", SAVINGS_IDS],
  ] as const)("lists every %s category id in order", (source, expected) => {
    expect(ids(getCategoriesForSource(source))).toEqual(expected);
  });

  it("lists only the income categories when asked for income", () => {
    expect(ids(getCategoriesForSource("rental", "income"))).toEqual(["rental_income"]);
    expect(ids(getCategoriesForSource("self-employed", "income"))).toEqual([
      "self_employed_income",
    ]);
    expect(ids(getCategoriesForSource("paye", "income"))).toEqual([
      "paye_salary",
      "paye_bonus",
      "paye_benefit",
    ]);
    expect(ids(getCategoriesForSource("savings", "income"))).toEqual([
      "savings_interest",
      "dividend_income",
      "isa_interest",
    ]);
  });

  it("lists only the expense categories when asked for expenses", () => {
    expect(ids(getCategoriesForSource("paye", "expense"))).toEqual(["paye_pension"]);
    expect(ids(getCategoriesForSource("savings", "expense"))).toEqual(["investment_fees"]);
    expect(ids(getCategoriesForSource("rental", "expense"))).toEqual(RENTAL_IDS.slice(1));
    expect(ids(getCategoriesForSource("self-employed", "expense"))).toEqual(
      SELF_EMPLOYED_IDS.slice(1),
    );
  });

  it("gives an empty list for a source it does not know", () => {
    expect(getCategoriesForSource("pension" as never)).toEqual([]);
  });
});

describe("ALL_TAX_CATEGORIES", () => {
  it("holds every category once, tagged with its source", () => {
    expect(ALL_TAX_CATEGORIES.map((c) => `${c.source}:${c.id}`)).toEqual([
      ...PAYE_IDS.map((id) => `paye:${id}`),
      ...SELF_EMPLOYED_IDS.map((id) => `self-employed:${id}`),
      ...RENTAL_IDS.map((id) => `rental:${id}`),
      ...SAVINGS_IDS.map((id) => `savings:${id}`),
    ]);
  });

  it("gives every category a label and an income or expense type", () => {
    for (const c of ALL_TAX_CATEGORIES) {
      expect(c.name.trim().length, c.id).toBeGreaterThan(0);
      expect(["income", "expense"], c.id).toContain(c.type);
    }
  });
});
