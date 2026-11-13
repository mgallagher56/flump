import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MortgageVsIsaCalculator } from "./MortgageVsIsaCalculator";

describe("MortgageVsIsaCalculator", () => {
  it("renders without crashing", () => {
    const { container } = render(<MortgageVsIsaCalculator />);
    expect(container).toBeDefined();
  });

  it("updates the figures when an input changes", () => {
    render(<MortgageVsIsaCalculator />);
    const tool = screen.getByTestId("mortgage-vs-isa-tool");
    const before = tool.textContent;
    fireEvent.change(document.getElementById("mortgage-bal") as HTMLInputElement, {
      target: { value: "400000" },
    });
    expect(tool.textContent).not.toBe(before);
  });

  it("calls onSaveAndContinue from the call to action", () => {
    const onSave = vi.fn();
    render(<MortgageVsIsaCalculator onSaveAndContinue={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: /Model your mortgage/ }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
