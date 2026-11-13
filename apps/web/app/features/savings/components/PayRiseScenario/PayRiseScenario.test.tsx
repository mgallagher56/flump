import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PayRiseScenario } from "./PayRiseScenario";

describe("<PayRiseScenario />", () => {
  it("shows the pay rise as a yearly scenario input that is not saved", () => {
    render(<PayRiseScenario monthlyIncrease={230} onRemove={vi.fn()} />);
    expect(screen.getByText(/Pay rise from take-home:/)).toBeDefined();
    expect(screen.getByText("£2,760")).toBeDefined();
    expect(screen.getByText("Illustration, not saved")).toBeDefined();
  });

  it("can be removed", () => {
    const onRemove = vi.fn();
    render(<PayRiseScenario monthlyIncrease={230} onRemove={onRemove} />);
    fireEvent.click(screen.getByRole("button", { name: /Remove/ }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
