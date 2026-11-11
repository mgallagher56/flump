import { describe, expect, it } from "vitest";
import { getSandboxPersonaData } from "./demoData";

describe("sandbox persona debtData", () => {
  it("persona A has a DebtSummary with a debt-free date in the future", () => {
    const { debtData } = getSandboxPersonaData("debt") as any;
    expect(debtData.totalDebt).toBe(8000);
    expect(debtData.debtCount).toBe(3);
    expect(debtData.highInterestCount).toBe(3);
    expect(debtData).not.toHaveProperty("interestSaved");
    const date = new Date(`1 ${debtData.debtFreeDate}`);
    expect(date.getTime()).toBeGreaterThan(Date.now());
  });

  it("debt-free personas have no debt summary", () => {
    expect((getSandboxPersonaData("medium") as any).debtData).toBeNull();
    expect((getSandboxPersonaData("high") as any).debtData).toBeNull();
  });
});
