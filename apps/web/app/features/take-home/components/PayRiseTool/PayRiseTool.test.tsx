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

  it("uses the currency input for the rise and treats a cleared field as nothing", () => {
    const props = renderTool({ monthlyIncrease: 0 });
    const input = screen.getByLabelText("Pay rise a year, before tax") as HTMLInputElement;
    expect(input.type).not.toBe("number");
    fireEvent.change(input, { target: { value: "7500" } });
    expect(props.onSalaryIncreaseChange).toHaveBeenLastCalledWith(7500);
    fireEvent.change(input, { target: { value: "" } });
    expect(props.onSalaryIncreaseChange).toHaveBeenLastCalledWith(0);
  });

  it("sends the monthly change to savings", () => {
    const props = renderTool({ monthlyIncrease: 230 });
    fireEvent.click(screen.getByRole("button", { name: "Model this in savings" }));
    expect(props.onApplyIncrease).toHaveBeenCalledWith(230);
  });
});
