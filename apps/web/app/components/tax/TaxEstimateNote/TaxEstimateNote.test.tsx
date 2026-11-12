import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TaxEstimateNote } from "./TaxEstimateNote";

describe("TaxEstimateNote", () => {
  it("states it is an estimate for the tax year, based on the user's figures", () => {
    render(<TaxEstimateNote taxYear="2026/27" />);
    expect(
      screen.getByText(/^Estimate for 2026\/27, based on the figures you entered$/),
    ).toBeDefined();
  });

  it("appends a labelled assumption", () => {
    render(<TaxEstimateNote assumption="Assumes a 4% drawdown rate." taxYear="2026/27" />);
    expect(screen.getByText(/Assumes a 4% drawdown rate\./).textContent).toContain(
      "Estimate for 2026/27",
    );
  });
});
