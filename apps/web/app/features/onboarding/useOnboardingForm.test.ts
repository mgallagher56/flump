import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { INITIAL_VALUES } from "./types";
import { stepperStates, useOnboardingForm } from "./useOnboardingForm";

describe("useOnboardingForm", () => {
  it("moves between steps within bounds", () => {
    const { result } = renderHook(() => useOnboardingForm());
    act(() => result.current.back());
    expect(result.current.step).toBe(1);
    act(() => result.current.goTo(99));
    expect(result.current.step).toBe(4);
    act(() => result.current.next());
    expect(result.current.step).toBe(4);
  });

  it("skip keeps what was entered and advances", () => {
    const { result } = renderHook(() => useOnboardingForm());
    act(() => result.current.update({ grossSalary: 1000, taxRegion: "WALES" }));
    act(() => result.current.skip(1));
    expect(result.current.values.grossSalary).toBe(1000);
    expect(result.current.values.taxRegion).toBe("WALES");
    expect(result.current.step).toBe(2);
  });

  it("marks a skipped step with answers as complete, so the stepper matches the review", () => {
    const { result } = renderHook(() => useOnboardingForm());
    act(() => result.current.goTo(2));
    act(() => result.current.setHousingStatus("mortgage"));
    act(() => result.current.skip(2));
    expect(result.current.outcomes.housing).toBe("complete");
  });

  it("records whether each step was completed or skipped", () => {
    const { result } = renderHook(() => useOnboardingForm());
    act(() => result.current.next());
    act(() => result.current.skip(2));
    expect(result.current.outcomes).toEqual({ income: "complete", housing: "skipped" });
    expect(result.current.step).toBe(3);
  });

  it("marks missing fields only after goToMissing, and clears that on any other move", () => {
    const { result } = renderHook(() => useOnboardingForm());
    act(() => result.current.goTo(4));
    expect(result.current.showMissing).toBe(false);
    act(() => result.current.goToMissing());
    expect(result.current.step).toBe(1);
    expect(result.current.showMissing).toBe(true);
    act(() => result.current.next());
    expect(result.current.showMissing).toBe(false);
  });

  it("clears the mortgage balance when housing is not a mortgage", () => {
    const { result } = renderHook(() => useOnboardingForm());
    act(() => result.current.setHousingStatus("mortgage"));
    act(() => result.current.update({ mortgageBalance: 200000, propertyValue: 300000 }));
    act(() => result.current.setHousingStatus("own_outright"));
    expect(result.current.values.mortgageBalance).toBeNull();
    expect(result.current.values.propertyValue).toBe(300000);
    act(() => result.current.setHousingStatus("renting"));
    expect(result.current.values.propertyValue).toBeNull();
  });
});

describe("useOnboardingForm answers", () => {
  it("clears the monthly housing amount when the housing answer changes", () => {
    const { result } = renderHook(() =>
      useOnboardingForm({ ...INITIAL_VALUES, housingStatus: "renting", monthlyHousingCost: 950 }),
    );
    act(() => result.current.setHousingStatus("renting"));
    expect(result.current.values.monthlyHousingCost).toBe(950);
    act(() => result.current.setHousingStatus("mortgage"));
    expect(result.current.values.monthlyHousingCost).toBeNull();
  });

  it("marks how the person earns as answered only once it is set", () => {
    const { result } = renderHook(() => useOnboardingForm());
    act(() => result.current.update({ grossSalary: 30000 }));
    expect(result.current.employmentAnswered).toBe(false);
    act(() => result.current.update({ employmentType: "employed" }));
    expect(result.current.employmentAnswered).toBe(true);
  });
});

describe("stepperStates", () => {
  it("never calls a skipped or unvisited earlier step complete", () => {
    expect(stepperStates({ income: "complete", housing: "skipped" }, 4)).toEqual({
      income: "complete",
      housing: "skipped",
      savings: "skipped",
    });
  });

  it("leaves the current step and later steps without an outcome to the Stepper default", () => {
    expect(stepperStates({ income: "complete", savings: "complete" }, 1)).toEqual({
      savings: "complete",
    });
  });
});
