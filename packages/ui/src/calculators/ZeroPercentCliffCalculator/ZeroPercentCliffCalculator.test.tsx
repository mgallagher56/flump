import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ZeroPercentCliffCalculator } from "./ZeroPercentCliffCalculator";

describe("ZeroPercentCliffCalculator", () => {
  it("renders without crashing", () => {
    const { container } = render(<ZeroPercentCliffCalculator />);
    expect(container).toBeDefined();
  });

  it("updates the target payment when the months change", () => {
    render(<ZeroPercentCliffCalculator />);
    const initial = screen.getByTestId("zero-percent-cliff-tool").textContent;
    fireEvent.change(screen.getByLabelText("Months remaining on 0% offer"), {
      target: { value: "6" },
    });
    expect(screen.getByTestId("zero-percent-cliff-tool").textContent).not.toBe(initial);
  });

  it("calls onSaveAndContinue with the balance", () => {
    const onSave = vi.fn();
    render(<ZeroPercentCliffCalculator ctaText="Go" onSaveAndContinue={onSave} />);
    fireEvent.change(screen.getByLabelText("Current 0% card balance (£)"), {
      target: { value: "5000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ totalUnsecuredDebt: 5000 }));
  });

  it("states the minimum-payment assumption and matches the engine for the defaults", () => {
    render(<ZeroPercentCliffCalculator />);
    const text = screen.getByTestId("zero-percent-cliff-tool").textContent ?? "";
    // calculateZeroPercentCliff(3600, 18, 24.9): £200 a month; minimum £72 leaves £2,304; £573.70 interest.
    expect(text).toContain("£200 / month");
    expect(text).toContain("2% of today's balance (at least £25)");
    expect(text).toContain("leave about £2,304");
    expect(text).toContain("about £574 of interest");
    expect(text).not.toMatch(/exact|you will/i);
  });

  it("formats a pence balance as currency and keeps months positive", () => {
    render(<ZeroPercentCliffCalculator />);
    fireEvent.change(screen.getByLabelText("Current 0% card balance (£)"), {
      target: { value: "3600.5" },
    });
    fireEvent.change(screen.getByLabelText("Months remaining on 0% offer"), {
      target: { value: "-3" },
    });
    const text = screen.getByTestId("zero-percent-cliff-tool").textContent ?? "";
    expect(text).toContain("£3,600.50 balance in 1 month");
    expect(text).not.toMatch(/-3 months/);
  });

  it("says when the minimum would clear the balance in time", () => {
    render(<ZeroPercentCliffCalculator />);
    fireEvent.change(screen.getByLabelText("Current 0% card balance (£)"), {
      target: { value: "400" },
    });
    expect(screen.getByTestId("zero-percent-cliff-tool").textContent).toContain(
      "would clear it before the 0% rate ends",
    );
  });
});
