import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PayRiseTool } from "./PayRiseTool";

const renderTool = (overrides: Partial<Parameters<typeof PayRiseTool>[0]> = {}) => {
  const props = {
    monthlyIncrease: 212,
    salaryIncrease: 5000,
    onApplyIncrease: vi.fn(),
    onSalaryIncreaseChange: vi.fn(),
    ...overrides,
  };
  render(<PayRiseTool {...props} />);
  return props;
};

describe("<PayRiseTool />", () => {
  it("shows the change in monthly take-home in whole pounds, with a sign and a unit", () => {
    renderTool();
    expect(screen.getByText("Change in take-home pay")).toBeDefined();
    expect(screen.getByText("+£212")).toBeDefined();
    expect(screen.getByText("a month")).toBeDefined();
  });

  it("uses a slider with an editable pill, never a number input, from £0 to £20,000", () => {
    const props = renderTool({ monthlyIncrease: 0 });
    const slider = screen.getByRole("slider");
    expect(slider.getAttribute("max")).toBe("20000");
    expect(slider.getAttribute("step")).toBe("500");
    fireEvent.change(slider, { target: { value: "7500" } });
    expect(props.onSalaryIncreaseChange).toHaveBeenLastCalledWith(7500);
    const pill = screen.getByLabelText("Pay rise a year, before tax input") as HTMLInputElement;
    expect(pill.type).not.toBe("number");
    expect(pill.value).toBe("£5,000");
  });

  it("sends the monthly change to savings", () => {
    const props = renderTool({ monthlyIncrease: 230 });
    fireEvent.click(screen.getByRole("button", { name: "Model this in savings" }));
    expect(props.onApplyIncrease).toHaveBeenCalledWith(230);
  });
});
