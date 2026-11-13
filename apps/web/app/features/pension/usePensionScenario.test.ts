import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePensionScenario } from "./usePensionScenario";

describe("usePensionScenario", () => {
  it("starts from the saved figures and is not modified", () => {
    const { result } = renderHook(() => usePensionScenario(6.2));
    expect(result.current.values).toMatchObject({
      extraMonthly: 0,
      growthRate: 6.2,
      horizonYears: 25,
    });
    expect(result.current.isModified).toBe(false);
  });

  it("marks edited inputs, and reset returns every value to saved", () => {
    const { result } = renderHook(() => usePensionScenario(6.2));
    act(() => {
      result.current.set("extraMonthly", 200);
      result.current.set("growthRate", 3);
      result.current.set("adjustForInflation", true);
    });
    expect(result.current.isModified).toBe(true);
    expect(result.current.isEdited("extraMonthly")).toBe(true);
    expect(result.current.isEdited("horizonYears")).toBe(false);
    act(() => result.current.reset());
    expect(result.current.values).toEqual(result.current.saved);
    expect(result.current.isModified).toBe(false);
  });

  it("setting an input back to the saved figure clears its edit", () => {
    const { result } = renderHook(() => usePensionScenario(5));
    act(() => result.current.set("extraMonthly", 50));
    act(() => result.current.set("extraMonthly", 0));
    expect(result.current.isModified).toBe(false);
  });

  it("unedited inputs follow the saved growth rate when it changes", () => {
    const { result, rerender } = renderHook(({ rate }) => usePensionScenario(rate), {
      initialProps: { rate: 5 },
    });
    rerender({ rate: 7 });
    expect(result.current.values.growthRate).toBe(7);
  });
});
