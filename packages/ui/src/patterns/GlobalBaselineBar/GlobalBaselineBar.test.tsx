import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GlobalBaselineBar } from "./GlobalBaselineBar";

describe("GlobalBaselineBar Pattern", () => {
  it("renders salary, pension pct, and stage badge", () => {
    render(<GlobalBaselineBar pensionPct={8} salary={55000} />);
    expect(screen.getByText("£55,000")).toBeDefined();
    expect(screen.getByText("8%")).toBeDefined();
    expect(screen.getByText("Stage 2: Buffer & Protect")).toBeDefined();
  });

  it("toggles inline parameter adjustment drawer", () => {
    render(<GlobalBaselineBar pensionPct={8} salary={55000} />);
    const toggleBtn = screen.getByRole("button", { name: "Adjust Baseline" });
    fireEvent.click(toggleBtn);
    expect(screen.getByLabelText("Gross Annual Salary (£)")).toBeDefined();
  });
});
