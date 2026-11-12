import { describe, expect, it } from "vitest";
import { FinanceController } from "../../src/finance.controller";
import { HealthController } from "../../src/health/health.controller";
import { McpController } from "../../src/mcp.controller";
import { RATE_LIMIT_CLASS, RATE_LIMIT_SKIP } from "../../src/security/rate-limit.decorator";
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

  it("exempts the health controller", () => {
    expect(Reflect.getMetadata(RATE_LIMIT_SKIP, HealthController)).toBe(true);
  });
});
