import { describe, expect, it } from "vitest";
import {
  CreateTaxRecordRequest,
  FINANCE_COSTS_BROUGHT_FORWARD_CATEGORY,
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

  it("still accepts other categories as before, and still refuses the legacy salary", () => {
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
