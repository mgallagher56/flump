import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TaxTrapCalculator } from "./TaxTrapCalculator";

describe("TaxTrapCalculator", () => {
  it("renders without crashing", () => {
    const { container } = render(<TaxTrapCalculator />);
    expect(container).toBeDefined();
  });

  it("labels results as estimates, never guarantees", () => {
    const { container } = render(<TaxTrapCalculator />);
    expect(screen.getByText("Estimated tax and NI saved")).toBeDefined();
    expect(screen.getByText("Estimate, not a guarantee")).toBeDefined();
    expect(container.textContent).not.toMatch(/guaranteed/i);
    expect(screen.getByTestId("tax-trap-estimate-note").textContent).toContain(
      "Estimate for 2026/27, based on the figures you entered",
    );
  });

  it("announces the estimated headline through its single live region", () => {
    render(<TaxTrapCalculator />);
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });
});
