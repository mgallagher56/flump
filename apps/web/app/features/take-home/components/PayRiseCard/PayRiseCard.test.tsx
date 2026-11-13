import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PayRiseCard } from "./PayRiseCard";

describe("<PayRiseCard />", () => {
  it("shows the extra monthly take-home with a sign and a unit", () => {
    render(
      <PayRiseCard
        monthlyIncrease={212}
        salaryIncrease={5000}
        onApplyIncrease={vi.fn()}
        onSalaryIncreaseChange={vi.fn()}
      />,
    );
    expect(screen.getByText("+£212")).toBeDefined();
    expect(screen.getByText("a month")).toBeDefined();
  });

  it("reports an edited rise, treating a cleared field as nothing", () => {
    const onChange = vi.fn();
    render(
      <PayRiseCard
        monthlyIncrease={0}
        salaryIncrease={5000}
        onApplyIncrease={vi.fn()}
        onSalaryIncreaseChange={onChange}
      />,
    );
    const input = screen.getByLabelText("Pay rise a year (gross)");
    fireEvent.change(input, { target: { value: "7500" } });
    expect(onChange).toHaveBeenLastCalledWith(7500);
    fireEvent.change(input, { target: { value: "" } });
    expect(onChange).toHaveBeenLastCalledWith(0);
  });

  it("hands the monthly rise to the forecast action", () => {
    const onApply = vi.fn();
    render(
      <PayRiseCard
        monthlyIncrease={123.4}
        salaryIncrease={5000}
        onApplyIncrease={onApply}
        onSalaryIncreaseChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Model this in the savings forecaster" }));
    expect(onApply).toHaveBeenCalledWith(123.4);
  });
});
