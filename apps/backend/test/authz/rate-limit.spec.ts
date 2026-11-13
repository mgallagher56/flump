import { describe, expect, it } from "vitest";
import { BudgetController } from "../../src/budget.controller";
import { FinanceController } from "../../src/finance.controller";
import { HealthController } from "../../src/health/health.controller";
import { McpController } from "../../src/mcp.controller";
import { RATE_LIMIT_CLASS, RATE_LIMIT_SKIP } from "../../src/security/rate-limit.decorator";
import { TaxController } from "../../src/tax.controller";
import { UserProfileController } from "../../src/user-profile.controller";

describe("rate limit classes on real controllers", () => {
  const classOf = (proto: object, method: string) =>
    Reflect.getMetadata(RATE_LIMIT_CLASS, (proto as Record<string, object>)[method]);

  it("marks credential, destructive, token mint and bank routes", () => {
    expect(classOf(UserProfileController.prototype, "sendPasswordReset")).toBe("credential");
    expect(classOf(UserProfileController.prototype, "resetFinancialData")).toBe("destructive");
    expect(classOf(McpController.prototype, "createToken")).toBe("tokenMint");
    expect(classOf(FinanceController.prototype, "deleteAccount")).toBe("destructive");
    expect(classOf(FinanceController.prototype, "connectBank")).toBe("bank");
    expect(classOf(FinanceController.prototype, "refreshBankConnection")).toBe("bank");
    expect(classOf(FinanceController.prototype, "syncBankConnection")).toBe("bank");
    expect(classOf(FinanceController.prototype, "deleteBankConnection")).toBe("destructive");
  });

  it("tightens revoke, delete and bulk routes", () => {
    expect(classOf(McpController.prototype, "revokeToken")).toBe("destructive");
    expect(classOf(TaxController.prototype, "deleteTaxRecord")).toBe("destructive");
    expect(classOf(TaxController.prototype, "createBulkTaxRecords")).toBe("bulkWrite");
    expect(classOf(BudgetController.prototype, "deleteBudgetEntry")).toBe("destructive");
  });

  it("puts receipt downloads in the tighter receiptRead class", () => {
    expect(classOf(TaxController.prototype, "getReceipt")).toBe("receiptRead");
  });

  it("exempts the health controller", () => {
    expect(Reflect.getMetadata(RATE_LIMIT_SKIP, HealthController)).toBe(true);
  });
});
