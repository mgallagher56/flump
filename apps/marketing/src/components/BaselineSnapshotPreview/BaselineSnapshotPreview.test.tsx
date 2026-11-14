import { expectPageRules } from "@repo/ui/testing";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BaselineSnapshotPreview } from "./BaselineSnapshotPreview";

describe("BaselineSnapshotPreview", () => {
  it("shows three example figures and labels them as an example", () => {
    const { container } = render(<BaselineSnapshotPreview />);
    expect(screen.getByRole("heading", { name: "Monthly picture" })).toBeDefined();
    expect(screen.getByText("Example")).toBeDefined();
    expect(screen.getByText("Net worth")).toBeDefined();
    expect(screen.getByText("Left over each month")).toBeDefined();
    expect(screen.getByText("6.4 months")).toBeDefined();
    expectPageRules(container, { maxFigures: 3, projectionNotices: 0 });
  });

  it("emphasises one figure, with no decorative shape", () => {
    const { container } = render(<BaselineSnapshotPreview />);
    expect(container.querySelectorAll('[data-tone="hero"]')).toHaveLength(1);
    const shape = container.querySelector("[data-decorative]");
    expect(shape?.closest('[data-tone="hero"]')?.className).toMatch(/data-decorative/);
  });

  it("uses no status colour, glow or link to a live demo", () => {
    const { container } = render(<BaselineSnapshotPreview />);
    expect(container.innerHTML).not.toMatch(/status-positive|status-danger|rgba\(/);
    expect(container.textContent).not.toMatch(/live|surplus|discretionary|\/mo|\/wk/i);
  });
});
