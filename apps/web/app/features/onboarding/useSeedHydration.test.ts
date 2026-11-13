import { clearOnboardingSeed, persistOnboardingSeed } from "@flump/finance-engine";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSeedHydration, valuesFromSeed } from "./useSeedHydration";

describe("useSeedHydration", () => {
  beforeEach(() => clearOnboardingSeed());

  it("does nothing without a seed", () => {
    const apply = vi.fn();
    const { result } = renderHook(() => useSeedHydration(apply));
    expect(apply).not.toHaveBeenCalled();
    expect(result.current.showBanner).toBe(false);
  });

  it("ignores a seed older than a day", () => {
    persistOnboardingSeed({
      annualIncome: 50000,
      timestamp: Date.now() - 25 * 60 * 60 * 1000,
    } as never);
    const apply = vi.fn();
    const { result } = renderHook(() => useSeedHydration(apply));
    expect(apply).not.toHaveBeenCalled();
    expect(result.current.showBanner).toBe(false);
  });

  it("applies only what a fresh seed carries and shows the banner", () => {
    persistOnboardingSeed({
      annualIncome: 75000,
      initialCashSavings: 18000,
      timestamp: Date.now(),
    } as never);
    const apply = vi.fn();
    const { result } = renderHook(() => useSeedHydration(apply));
    expect(apply).toHaveBeenCalledWith(
      expect.objectContaining({ grossSalary: 75000, cashSavings: 18000 }),
    );
    expect(result.current.showBanner).toBe(true);
    expect(result.current.seedHasNumbers).toBe(true);
  });

  it("choices-only seeds show the banner but fill nothing", () => {
    persistOnboardingSeed({ inferredModules: ["accounts"], timestamp: Date.now() } as never);
    const apply = vi.fn();
    const { result } = renderHook(() => useSeedHydration(apply));
    expect(apply).not.toHaveBeenCalled();
    expect(result.current.showBanner).toBe(true);
    expect(result.current.seedHasNumbers).toBe(false);
  });
});

describe("valuesFromSeed", () => {
  it("leaves unset balances null", () => {
    const patch = valuesFromSeed({ annualIncome: 60000, timestamp: Date.now() } as never);
    expect(patch.grossSalary).toBe(60000);
    expect(patch.mortgageBalance).toBeNull();
    expect(patch.unsecuredDebt).toBeNull();
  });
});
