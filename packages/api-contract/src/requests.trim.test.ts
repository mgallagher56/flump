import { describe, expect, it } from "vitest";
import { ConnectBankRequest } from "./domains/bank-connections.js";
import {
  AddBudgetCategoryRequest,
  CreateBudgetEntryRequest,
  UpdateBudgetEntryRequest,
} from "./domains/budget.js";
import { CreateMcpTokenRequest } from "./domains/mcp-tokens.js";

// Handlers read the parsed output, "trimmed strings, coerced numbers" (validate.ts parseAgainst,
// backend contract-shadow.interceptor.ts), so a name or category typed with spaces around it is
// stored without them, and one made only of spaces is not a name at all.

describe("budget entry text", () => {
  it("is stored without surrounding spaces on create", () => {
    const parsed = CreateBudgetEntryRequest.parse({
      category: "  living  ",
      name: "  Rent  ",
      title: "  Rent  ",
      amount: 950,
    });
    expect([parsed.category, parsed.name, parsed.title]).toEqual(["living", "Rent", "Rent"]);
  });

  it("is stored without surrounding spaces on update", () => {
    const parsed = UpdateBudgetEntryRequest.parse({ name: "  Rent  ", title: "  Rent  " });
    expect([parsed.name, parsed.title]).toEqual(["Rent", "Rent"]);
  });

  it("refuses a name or category made only of spaces", () => {
    expect(CreateBudgetEntryRequest.safeParse({ category: "   ", amount: 950 }).success).toBe(
      false,
    );
    expect(UpdateBudgetEntryRequest.safeParse({ name: "   " }).success).toBe(false);
  });

  it("adds a custom category without surrounding spaces", () => {
    expect(AddBudgetCategoryRequest.parse({ category: "  Pets  " }).category).toBe("Pets");
    expect(AddBudgetCategoryRequest.safeParse({ category: "   " }).success).toBe(false);
  });
});

describe("AI connection token name", () => {
  it("is stored without surrounding spaces, and a blank name is refused", () => {
    expect(CreateMcpTokenRequest.parse({ name: "  Claude  " }).name).toBe("Claude");
    expect(CreateMcpTokenRequest.safeParse({ name: "   " }).success).toBe(false);
  });
});

describe("bank connection institution", () => {
  it("is read without surrounding spaces, and a blank one is refused", () => {
    expect(ConnectBankRequest.parse({ institutionId: " monzo " }).institutionId).toBe("monzo");
    expect(ConnectBankRequest.safeParse({ institutionId: "   " }).success).toBe(false);
  });
});
