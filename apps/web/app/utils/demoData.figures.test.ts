import { describe, expect, it } from "vitest";
import { getSandboxPersonaData } from "./demoData";

const PERSONAS = ["debt", "medium", "high"] as const;

describe("sandbox persona figures come from the engine picture (E23)", () => {
  it.each(PERSONAS)(
    "%s: net worth is assets minus liabilities from the persona's accounts",
    (p) => {
      const { accountsData, budgetData } = getSandboxPersonaData(p);
      expect(accountsData.netWorth).toBe(accountsData.totalAssets - accountsData.totalLiabilities);
      expect(accountsData.accountsCount).toBe(budgetData.rawAccounts.length);
    },
  );

  it.each(PERSONAS)(
    "%s: the salary income row matches the engine's take-home for the profile",
    (p) => {
      const { budgetData, userProfile } = getSandboxPersonaData(p);
      const salaryRow = budgetData.rawEntries.find((e) => e.isIncome);
      expect(budgetData.takeHomeMonthly).not.toBeNull();
      expect(salaryRow?.amount).toBe(Math.round(budgetData.takeHomeMonthly as number));
      expect(userProfile.monthlyTakeHome).toBe(salaryRow?.amount);
    },
  );

  it.each(PERSONAS)("%s: safe to spend and months of cover are known", (p) => {
    const { budgetData } = getSandboxPersonaData(p);
    expect(budgetData.safeToSpendWeekly).not.toBeNull();
    expect(budgetData.monthsOfCover).not.toBeNull();
  });

  it("the higher earner's property is held as accounts, so net worth includes it", () => {
    const { accountsData } = getSandboxPersonaData("high");
    expect(accountsData.typeTotals.Property).toBe(718000);
    expect(accountsData.netWorth).toBe(441500);
  });
});
