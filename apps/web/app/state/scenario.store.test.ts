import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useFinancialBaseline } from "./baseline.store";
import { useScenario } from "./scenario.store";

describe("scenario.store & useScenario", () => {
  it("toggles scenario, updates overrides, computes effectiveBaseline, and resets", () => {
    const { result: baselineResult } = renderHook(() => useFinancialBaseline());
    const { result } = renderHook(() => useScenario());

    act(() => {
      result.current.resetScenario();
    });

    expect(result.current.isActive).toBe(false);
    expect(result.current.effectiveBaseline.annualGrossSalary).toBe(
      baselineResult.current.baseline.annualGrossSalary,
    );

    act(() => {
      result.current.toggleScenario();
    });
    expect(result.current.isActive).toBe(true);

    act(() => {
      result.current.toggleScenario(false);
    });
    expect(result.current.isActive).toBe(false);

    act(() => {
      result.current.updateOverrides({
        annualGrossSalary: 95000,
        pensionContributionPct: 12,
        isSalarySacrifice: false,
      });
    });

    expect(result.current.isActive).toBe(true);
    expect(result.current.overrides.annualGrossSalary).toBe(95000);
    expect(result.current.effectiveBaseline.annualGrossSalary).toBe(95000);
    expect(result.current.effectiveBaseline.pensionContributionPct).toBe(12);
    expect(result.current.effectiveBaseline.isSalarySacrifice).toBe(false);

    act(() => {
      result.current.resetScenario();
    });

    expect(result.current.isActive).toBe(false);
    expect(result.current.overrides).toEqual({});
  });
});
