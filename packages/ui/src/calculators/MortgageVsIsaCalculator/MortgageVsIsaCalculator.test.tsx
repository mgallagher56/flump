import { calculateMortgageVsIsa } from "@flump/finance-engine";
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

  it("shows the engine's figures for the defaults (£240,000 at 4.5%, 20 years, £350, 7%)", () => {
    render(<MortgageVsIsaCalculator />);
    const res = calculateMortgageVsIsa(240000, 4.5, 20, 350, 7);
    const text = screen.getByTestId("mortgage-vs-isa-tool").textContent ?? "";
    expect(text).toContain(`£${Math.round(res.interestSaved).toLocaleString("en-GB")}`);
    expect(text).toContain(`£${Math.round(res.isaAccumulatedValue).toLocaleString("en-GB")}`);
  });

  it("uses the remaining term the user sets", () => {
    render(<MortgageVsIsaCalculator />);
    fireEvent.change(document.getElementById("mortgage-term") as HTMLInputElement, {
      target: { value: "10" },
    });
    const res = calculateMortgageVsIsa(240000, 4.5, 10, 350, 7);
    expect(screen.getByTestId("mortgage-vs-isa-tool").textContent).toContain(
      `£${Math.round(res.isaAccumulatedValue).toLocaleString("en-GB")}`,
    );
  });

  it("ignores a negative balance instead of showing negative figures", () => {
    render(<MortgageVsIsaCalculator />);
    fireEvent.change(document.getElementById("mortgage-bal") as HTMLInputElement, {
      target: { value: "-5000" },
    });
    expect((document.getElementById("mortgage-bal") as HTMLInputElement).value).toBe("0");
  });

  it("claims no feature Flump lacks and avoids advice wording", () => {
    const { container } = render(<MortgageVsIsaCalculator />);
    expect(container.textContent).not.toMatch(
      /sync|automatically|live ISA|guaranteed (interest|saving|return)|\bSave £|Mathematically/i,
    );
  });
});
