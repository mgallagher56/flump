import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardPreview } from "./DashboardPreview";

describe("DashboardPreview", () => {
  it("renders renter figures correctly from the engine", () => {
    render(<DashboardPreview household="renter" id="test-dash-renter" />);

    // Net worth for Sam: £6,050
    expect(screen.getByText("Net worth")).toBeDefined();
    expect(screen.getAllByText("£6,050").length).toBeGreaterThanOrEqual(1);

    // KPI cards and section cards
    expect(screen.getAllByText("Left over each month").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("£752").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("What you owe")).toBeDefined();
    expect(screen.getByText("£41,500")).toBeDefined();

    // Section cards
    expect(screen.getByTestId("test-dash-renter-section-budget")).toBeDefined();
    expect(screen.getByTestId("test-dash-renter-section-accounts")).toBeDefined();
    expect(screen.getByTestId("test-dash-renter-section-housing")).toBeDefined();
    expect(screen.getByTestId("test-dash-renter-section-savings")).toBeDefined();
  });

  it("renders homeowner figures correctly from the engine", () => {
    render(<DashboardPreview household="homeowner" id="test-dash-owner" />);

    // Net worth for homeowner: £241,000 with home estimate label
    expect(screen.getByText("Net worth, including your home estimate")).toBeDefined();
    expect(screen.getByText("£241,000")).toBeDefined();

    // KPI cards and section cards
    expect(screen.getAllByText("Left over each month").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("£919").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Pension pots").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("£96,000").length).toBeGreaterThanOrEqual(1);

    // Section cards
    expect(screen.getByTestId("test-dash-owner-section-mortgage")).toBeDefined();
    expect(screen.getByTestId("test-dash-owner-section-pension")).toBeDefined();
  });
});
