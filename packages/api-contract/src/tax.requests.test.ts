import { ALL_TAX_CATEGORIES } from "@flump/finance-engine";
import { describe, expect, it } from "vitest";
import {
  broughtForwardRuleError,
  CreateTaxRecordRequest,
  FINANCE_COSTS_BROUGHT_FORWARD_CATEGORY,
  TAX_RECORD_CATEGORIES,
  TAX_RECORD_SOURCES,
  TaxRecordDto,
  taxCategoryError,
  UpdateTaxRecordRequest,
} from "./domains/tax.js";

const record = {
  type: "expense",
  source: "rental",
  category: FINANCE_COSTS_BROUGHT_FORWARD_CATEGORY,
  name: "Finance costs brought forward",
  amount: 1570,
  frequency: "annual",
  date: "2026-06-06",
};

describe("finance costs brought forward record", () => {
  it("is the category the engine reads", () => {
    expect(FINANCE_COSTS_BROUGHT_FORWARD_CATEGORY).toBe("finance_costs_brought_forward");
  });

  it("is accepted as a rental expense", () => {
    expect(CreateTaxRecordRequest.safeParse(record).success).toBe(true);
  });

  it("is refused with any other source or type", () => {
    expect(CreateTaxRecordRequest.safeParse({ ...record, source: "self-employed" }).success).toBe(
      false,
    );
    expect(CreateTaxRecordRequest.safeParse({ ...record, type: "income" }).success).toBe(false);
    expect(UpdateTaxRecordRequest.safeParse({ ...record, source: "savings" }).success).toBe(false);
  });

  it("still accepts other known categories, and still refuses the legacy salary", () => {
    expect(
      CreateTaxRecordRequest.safeParse({ ...record, category: "repairs_maintenance" }).success,
    ).toBe(true);
    expect(
      CreateTaxRecordRequest.safeParse({ ...record, source: "paye", category: "paye_salary" })
        .success,
    ).toBe(false);
    expect(UpdateTaxRecordRequest.safeParse({ amount: 10 }).success).toBe(true);
  });
});

describe("finance costs brought forward frequency", () => {
  it("is refused as a monthly record: it is one figure for one year", () => {
    expect(CreateTaxRecordRequest.safeParse({ ...record, frequency: "monthly" }).success).toBe(
      false,
    );
    expect(CreateTaxRecordRequest.safeParse({ ...record, frequency: "one-off" }).success).toBe(
      true,
    );
  });

  it("names the rule for a whole record, so an update can be checked after merging", () => {
    expect(broughtForwardRuleError({ ...record })).toBeNull();
    expect(broughtForwardRuleError({ ...record, type: "income" })).not.toBeNull();
    expect(broughtForwardRuleError({ ...record, frequency: "monthly" })).not.toBeNull();
    expect(
      broughtForwardRuleError({ ...record, category: "repairs_maintenance", type: "income" }),
    ).toBeNull();
  });
});

describe("known tax record categories", () => {
  const rent = {
    type: "income",
    source: "rental",
    category: "rental_income",
    name: "Rent from the flat",
    amount: 1150,
    frequency: "monthly",
    date: "2026-04-06",
  };

  it("are the engine's lists, one per source, without the legacy salary", () => {
    expect(TAX_RECORD_CATEGORIES.rental).toEqual(
      ALL_TAX_CATEGORIES.filter((c) => c.source === "rental").map((c) => c.id),
    );
    expect(TAX_RECORD_CATEGORIES["self-employed"]).toContain("self_employed_income");
    expect(TAX_RECORD_CATEGORIES.savings).toContain("savings_interest");
    expect(TAX_RECORD_CATEGORIES.paye).not.toContain("paye_salary");
    expect(Object.keys(TAX_RECORD_CATEGORIES).sort()).toEqual([...TAX_RECORD_SOURCES].sort());
  });

  it("accept a known category for its source on create", () => {
    expect(CreateTaxRecordRequest.safeParse(rent).success).toBe(true);
  });

  it("refuse an unknown category on create, on the category field", () => {
    const result = CreateTaxRecordRequest.safeParse({ ...rent, category: "Rent" });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path.join("."))).toEqual(["category"]);
  });

  it("refuse a known category under the wrong source", () => {
    const result = CreateTaxRecordRequest.safeParse({ ...rent, source: "savings" });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path.join("."))).toEqual(["category"]);
  });

  it("are checked on an update that sends source and category together", () => {
    expect(
      UpdateTaxRecordRequest.safeParse({ source: "rental", category: "repairs_maintenance" })
        .success,
    ).toBe(true);
    expect(
      UpdateTaxRecordRequest.safeParse({ source: "rental", category: "Repairs" }).success,
    ).toBe(false);
  });

  it("refuse a category no source lists, even without the source", () => {
    expect(UpdateTaxRecordRequest.safeParse({ category: "Repairs" }).success).toBe(false);
    expect(UpdateTaxRecordRequest.safeParse({ category: "repairs_maintenance" }).success).toBe(
      true,
    );
  });

  it("leave an update that does not touch the category alone", () => {
    expect(UpdateTaxRecordRequest.safeParse({ name: "Renamed" }).success).toBe(true);
  });

  it("name the problem for a whole record, so the backend can check after merging", () => {
    expect(taxCategoryError({ source: "rental", category: "rental_income" })).toBeNull();
    expect(taxCategoryError({ source: "rental", category: "Rent" })).toEqual({
      path: "category",
      message: expect.any(String),
    });
  });

  it("still accept a stored record with any category in a response", () => {
    expect(TaxRecordDto.shape.category.safeParse("Rent").success).toBe(true);
  });
});
