import { expectPageRules } from "@repo/ui/testing";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  BaselineSnapshotPreview,
  HOME_PREVIEW_HOUSEHOLD,
  PREVIEW_EXAMPLE,
} from "./BaselineSnapshotPreview";

describe("BaselineSnapshotPreview", () => {
  it("takes its figures from the sample household the preview page opens on", () => {
    // Worked by hand from the renter persona (finance-engine picture/__fixtures__/personas/sam.ts):
    // net worth: 1,850 current + 4,200 cash ISA = 6,050 (the student loan is not counted).
    // left over: 2,382 pay - 850 rent - 120 bills - 220 groceries - 90 travel - 150 ISA saving
    //   - 200 going out = 752.
    // breathing room: 6,050 liquid cash / 1,280 essentials = 4.73, so 4.7 months.
    expect(HOME_PREVIEW_HOUSEHOLD).toBe("renter");
    expect(PREVIEW_EXAMPLE.netWorthGbp).toBe(6050);
    expect(PREVIEW_EXAMPLE.leftOverMonthlyGbp).toBe(752);
    expect(PREVIEW_EXAMPLE.monthsOfCover).toBe(4.7);
  });

  it("shows three example figures and labels them as an example", () => {
    const { container } = render(<BaselineSnapshotPreview />);
    expect(screen.getByRole("heading", { name: "Monthly picture" })).toBeDefined();
    expect(screen.getByText("Example")).toBeDefined();
    expect(screen.getByText("Example household. These are sample figures.")).toBeDefined();
    expect(screen.getByText("Net worth")).toBeDefined();
    expect(screen.getByText("£6,050")).toBeDefined();
    expect(screen.getByText("Left over each month")).toBeDefined();
    expect(screen.getByText("Breathing room")).toBeDefined();
    expect(screen.getByText("About 4.7 months")).toBeDefined();
    expect(screen.getByText("How long your savings would cover the essentials.")).toBeDefined();
    expectPageRules(container, { maxFigures: 3, projectionNotices: 0 });
  });

  it("emphasises one figure, with no decorative shape", () => {
    const { container } = render(<BaselineSnapshotPreview />);
    expect(container.querySelectorAll('[data-tone="hero"]')).toHaveLength(1);
    expect(container.querySelector("[data-decorative]")).toBeNull();
  });

  it("uses no status colour, glow or link to a live demo", () => {
    const { container } = render(<BaselineSnapshotPreview />);
    expect(container.innerHTML).not.toMatch(/status-positive|status-danger|rgba\(/);
    expect(container.textContent).not.toMatch(/live|surplus|discretionary|\/mo|\/wk/i);
  });
});
