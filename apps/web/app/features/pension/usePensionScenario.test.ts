import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePensionScenario } from "./usePensionScenario";

const seed = { contributionPercent: 8, horizonYears: 32, growthRate: 6.2 };

describe("usePensionScenario", () => {
  it("starts from the saved figures, in today's money, and is not modified", () => {
    const { result } = renderHook(() => usePensionScenario(seed));
    expect(result.current.values).toMatchObject({
      contributionPercent: 8,
      growthRate: 6.2,
      horizonYears: 32,
      adjustForInflation: true,
    });
    expect(result.current.isModified).toBe(false);
  });

  it("marks edited inputs, and reset returns every value to saved", () => {
    const { result } = renderHook(() => usePensionScenario(seed));
    act(() => {
      result.current.set("contributionPercent", 10);
      result.current.set("growthRate", 3);
      result.current.set("adjustForInflation", false);
    });
    expect(result.current.isModified).toBe(true);
    expect(result.current.isEdited("contributionPercent")).toBe(true);
    expect(result.current.isEdited("horizonYears")).toBe(false);
    act(() => result.current.reset());
    expect(result.current.values).toEqual(result.current.saved);
    expect(result.current.isModified).toBe(false);
  });

  it("setting an input back to the saved figure clears its edit", () => {
    const { result } = renderHook(() => usePensionScenario(seed));
    act(() => result.current.set("contributionPercent", 12));
    act(() => result.current.set("contributionPercent", 8));
    expect(result.current.isModified).toBe(false);
  });

  it("unedited inputs follow the saved growth rate when it changes", () => {
    const { result, rerender } = renderHook(
      ({ rate }) => usePensionScenario({ ...seed, growthRate: rate }),
      { initialProps: { rate: 5 } },
    );
    rerender({ rate: 7 });
    expect(result.current.values.growthRate).toBe(7);
  });
});
