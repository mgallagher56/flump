import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import {
  NextPoundExplorer,
  type NextPoundSaved,
  nextPoundSavedValues,
  useNextPoundScenario,
} from "./NextPoundExplorer";

const saved: NextPoundSaved = {
  salary: 45_000,
  taxRegion: "SCOTLAND",
  studentLoanPlans: ["PLAN_2", "POSTGRAD"],
  isSalarySacrifice: true,
  pensionPercent: 5,
  taxYear: "2026/27",
};

const Harness = ({ seed }: { seed: NextPoundSaved }) => {
  const scenario = useNextPoundScenario(seed);
  return (
    <>
      <span id="modified">{String(scenario.isModified)}</span>
      <button type="button" onClick={scenario.reset}>
        Reset
      </button>
      <NextPoundExplorer scenario={scenario} />
    </>
  );
};

describe("nextPoundSavedValues", () => {
  test("seeds salary, region, plans and pension amount from saved details", () => {
    expect(nextPoundSavedValues(saved)).toMatchObject({
      grossPay: 45_000,
      region: "SCOTLAND",
      studentLoans: "plan2+postgrad",
      pensionMethod: "salary-sacrifice",
      pensionAmount: 2250,
      childBenefit: false,
      extraPension: 0,
      taxYear: "2026/27",
    });
  });

  test("uses net pay when salary sacrifice is off and the older single plan field", () => {
    const v = nextPoundSavedValues({
      ...saved,
      isSalarySacrifice: false,
      studentLoanPlans: null,
      studentLoanPlan: "PLAN_1",
      taxRegion: "WALES",
    });
    expect(v).toMatchObject({
      pensionMethod: "net-pay",
      studentLoans: "plan1",
      region: "ENGLAND_NI_WALES",
    });
  });

  test("falls back to the £39,000 example with no pension when no salary is saved", () => {
    expect(nextPoundSavedValues({ ...saved, salary: 0, studentLoanPlans: [] })).toMatchObject({
      grossPay: 39_000,
      pensionMethod: "none",
      pensionAmount: 0,
      studentLoans: "",
    });
  });
});

describe("<NextPoundExplorer />", () => {
  test("with no saved salary it works from the £39,000 example", () => {
    render(<Harness seed={{ ...saved, salary: 0, taxRegion: null, studentLoanPlans: [] }} />);
    // The KPI cards carry the split; no sentence repeats it (E16 RESCORE B, pay rise item 1).
    expect(document.querySelector('[data-testid="take-home-delta-sentence"]')).toBeNull();
    expect(document.body.textContent).toContain("£720");
  });

  test("edits stay in memory, send no request and reset to the saved figures", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<Harness seed={saved} />);
    expect(screen.getByTestId("modified").textContent).toBe("false");
    expect((screen.getByLabelText("Pay before tax a year input") as HTMLInputElement).value).toBe(
      "£45,000",
    );
    // The pension action sits inside "More options".
    fireEvent.click(screen.getByRole("button", { name: "More options" }));
    fireEvent.click(screen.getByRole("button", { name: "Model a pension contribution" }));
    expect(
      (screen.getByLabelText("Extra pension contribution input") as HTMLInputElement).value,
    ).toBe("£1,000");
    expect(screen.getByTestId("modified").textContent).toBe("true");
    expect(fetchSpy).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByTestId("modified").textContent).toBe("false");
    expect(screen.queryByLabelText("Extra pension contribution input")).toBeNull();
    fetchSpy.mockRestore();
  });
});
