import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BreathingRoomPreview } from "./BreathingRoomPreview";

describe("BreathingRoomPreview", () => {
  it("renders renter baseline Breathing room from engine", () => {
    render(<BreathingRoomPreview household="renter" id="test-br-renter" />);

    expect(screen.getByRole("heading", { name: "Model a change" })).toBeDefined();
    expect(screen.getByText("Breathing room")).toBeDefined();
    // Sam: 6,050 / 1,280 = 4.7 months
    expect(screen.getByText("About 4.7 months")).toBeDefined();
    expect(screen.getByText("How long your savings would cover the essentials.")).toBeDefined();
    expect(screen.getByTestId("test-br-renter-essentials").textContent).toBe("£1,280 a month");
    expect(screen.getByTestId("test-br-renter-savings").textContent).toBe("£6,050");
  });

  it("renders homeowner baseline Breathing room from engine", () => {
    render(<BreathingRoomPreview household="homeowner" id="test-br-owner" />);

    expect(screen.getByRole("heading", { name: "Model a change" })).toBeDefined();
    // Homeowner: 21,000 / 1,780 = 11.8 months
    expect(screen.getByText("About 11.8 months")).toBeDefined();
    expect(screen.getByTestId("test-br-owner-essentials").textContent).toBe("£1,780 a month");
    expect(screen.getByTestId("test-br-owner-savings").textContent).toBe("£21,000");
  });
});
