import { buildFinancialPicture, SAMPLE_HOUSEHOLDS } from "@flump/finance-engine";
import { expectPageRules } from "@repo/ui/testing";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  BaselineSnapshotPreview,
  HOME_PREVIEW_HOUSEHOLD,
  PREVIEW_EXAMPLE,
} from "./BaselineSnapshotPreview";

const gbp = (value: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);

describe("BaselineSnapshotPreview", () => {
  it("takes its figures from the sample household the preview page opens on", () => {
    const picture = buildFinancialPicture(SAMPLE_HOUSEHOLDS[HOME_PREVIEW_HOUSEHOLD].fixture);
    expect(PREVIEW_EXAMPLE.netWorthGbp).toBe(picture.netWorth.netWorth);
    expect(PREVIEW_EXAMPLE.leftOverMonthlyGbp).toBe(
      picture.budget.status === "known" ? picture.budget.value.surplus : null,
    );
    expect(PREVIEW_EXAMPLE.monthsOfCover).toBe(
      picture.monthsOfCover.status === "known" ? picture.monthsOfCover.value.months : null,
    );
  });

  it("shows three example figures and labels them as an example", () => {
    const { container } = render(<BaselineSnapshotPreview />);
    expect(screen.getByRole("heading", { name: "Monthly picture" })).toBeDefined();
    expect(screen.getByText("Example")).toBeDefined();
    expect(screen.getByText("Example household. These are sample figures.")).toBeDefined();
    expect(screen.getByText("Net worth")).toBeDefined();
    expect(screen.getByText(gbp(PREVIEW_EXAMPLE.netWorthGbp))).toBeDefined();
    expect(screen.getByText("Left over each month")).toBeDefined();
    expect(screen.getByText("Breathing room")).toBeDefined();
    expect(screen.getByText(/^About \d+(\.\d)? months?$/)).toBeDefined();
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
