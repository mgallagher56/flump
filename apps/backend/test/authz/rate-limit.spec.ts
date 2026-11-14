import { describe, expect, it } from "vitest";
import { HealthController } from "../../src/health/health.controller";
import { McpController } from "../../src/modules/agent/mcp.controller";
import { BudgetController } from "../../src/modules/budget/budget.controller";
import { FinanceController } from "../../src/modules/finance/finance.controller";
import { UserProfileController } from "../../src/modules/profile/user-profile.controller";
import { TaxController } from "../../src/modules/tax/tax.controller";
import { RATE_LIMIT_CLASS, RATE_LIMIT_SKIP } from "../../src/security/rate-limit.decorator";
import { must } from "../../src/testing/must";

describe("rate limit classes on real controllers", () => {
  const classOf = (proto: object, method: string) =>
    Reflect.getMetadata(RATE_LIMIT_CLASS, must((proto as Record<string, object>)[method], method));

  it("marks credential, destructive, token mint and bank routes", () => {
    expect(classOf(UserProfileController.prototype, "sendPasswordReset")).toBe("credential");
    expect(classOf(UserProfileController.prototype, "resetFinancialData")).toBe("destructive");
    expect(classOf(UserProfileController.prototype, "deleteUser")).toBe("destructive");
    expect(classOf(UserProfileController.prototype, "exportData")).toBe("dataExport");
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
