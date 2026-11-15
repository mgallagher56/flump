import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CheckInPreview } from "./CheckInPreview";

describe("CheckInPreview", () => {
  it("renders first account and advances with No change", () => {
    render(<CheckInPreview household="renter" id="test-checkin" />);

    expect(screen.getByText("1 of 3")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Monzo current" })).toBeDefined();
    expect(screen.getByText("Current account")).toBeDefined();
    expect(screen.getByText("Saved balance: £1,850")).toBeDefined();

    // Click No change to advance to step 2
    const noChangeBtn = screen.getByTestId("test-checkin-no-change");
    fireEvent.click(noChangeBtn);

    expect(screen.getByText("2 of 3")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Cash ISA" })).toBeDefined();

    // Back button is now visible
    const backBtn = screen.getByTestId("test-checkin-back");
    fireEvent.click(backBtn);

    expect(screen.getByText("1 of 3")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Monzo current" })).toBeDefined();
  });

  it("advances with Update button and completes check-in", () => {
    render(<CheckInPreview household="renter" id="test-checkin" />);

    // Update step 1
    fireEvent.click(screen.getByTestId("test-checkin-update"));
    expect(screen.getByText("2 of 3")).toBeDefined();

    // No change to rest completes all remaining steps
    const noChangeRestBtn = screen.getByTestId("test-checkin-no-change-rest");
    fireEvent.click(noChangeRestBtn);

    expect(screen.getByText("Check-in complete for this month")).toBeDefined();
    expect(screen.getByText("Step through again")).toBeDefined();

    // Reset works
    fireEvent.click(screen.getByTestId("test-checkin-reset"));
    expect(screen.getByText("1 of 3")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Monzo current" })).toBeDefined();
  });

  it("renders calculable account for homeowner with Keep this figure", () => {
    render(<CheckInPreview household="homeowner" id="test-checkin-owner" />);

    // Fast-forward to mortgage (step 3)
    fireEvent.click(screen.getByTestId("test-checkin-owner-no-change"));
    fireEvent.click(screen.getByTestId("test-checkin-owner-no-change"));

    expect(screen.getByText("3 of 3")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Residential Mortgage" })).toBeDefined();
    expect(screen.getByText("Calculated for this month: £185,420")).toBeDefined();
    expect(screen.getByTestId("test-checkin-owner-keep")).toBeDefined();

    // Click Keep this figure
    fireEvent.click(screen.getByTestId("test-checkin-owner-keep"));
    expect(screen.getByText("Check-in complete for this month")).toBeDefined();
  });
});
