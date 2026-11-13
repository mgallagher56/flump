import { beforeEach, describe, expect, it } from "vitest";
import { clearRunwaySettings, isCashAccountType, RUNWAY_STORAGE_KEY } from "./runwayStorage";

describe("runwayStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("removes an account preference saved by an older version", () => {
    window.localStorage.setItem(RUNWAY_STORAGE_KEY, JSON.stringify({ includedAccounts: {} }));
    clearRunwaySettings();
    expect(window.localStorage.getItem(RUNWAY_STORAGE_KEY)).toBeNull();
  });

  it("counts current and savings accounts as cash, not investments", () => {
    expect(isCashAccountType(undefined)).toBe(false);
    expect(isCashAccountType("Current")).toBe(true);
    expect(isCashAccountType("Saving")).toBe(true);
    expect(isCashAccountType("Savings")).toBe(true);
    expect(isCashAccountType("Investment")).toBe(false);
    expect(isCashAccountType("Mortgage")).toBe(false);
  });
});
