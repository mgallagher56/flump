import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PayRiseScenario } from "./PayRiseScenario";

describe("<PayRiseScenario />", () => {
  it("shows the pay rise as a yearly scenario input", () => {
    render(<PayRiseScenario monthlyIncrease={230} onRemove={vi.fn()} />);
    expect(screen.getByText(/Pay rise from the take-home pay tool:/)).toBeDefined();
    expect(screen.getByText("£2,760")).toBeDefined();
  });

  it("can be removed", () => {
    const onRemove = vi.fn();
    render(<PayRiseScenario monthlyIncrease={230} onRemove={onRemove} />);
    fireEvent.click(screen.getByRole("button", { name: /Remove/ }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
