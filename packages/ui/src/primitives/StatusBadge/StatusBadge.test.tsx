import { render, screen } from "@testing-library/react";
import { Info } from "lucide-react";
import { describe, expect, it } from "vitest";
import { Icon } from "../Icon";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge Primitive", () => {
  it("renders status badge content with tabular numbers", () => {
    render(<StatusBadge variant="positive">+£14,250 Saved</StatusBadge>);
    expect(screen.getByText("+£14,250 Saved")).toBeDefined();
  });

  it("shows no icon by default", () => {
    const { container } = render(<StatusBadge variant="danger">Overdue</StatusBadge>);
    expect(container.querySelector("svg")).toBeNull();
  });

  it("adds a decorative tone icon with showIcon, words still carry the meaning", () => {
    const { container } = render(
      <StatusBadge showIcon variant="danger">
        Overdue
      </StatusBadge>,
    );
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByText("Overdue")).toBeDefined();
  });

  it("has no standard icon for neutral", () => {
    const { container } = render(
      <StatusBadge showIcon variant="neutral">
        Not linked
      </StatusBadge>,
    );
    expect(container.querySelector("svg")).toBeNull();
  });

  it("prefers a custom icon over showIcon", () => {
    const { container } = render(
      <StatusBadge icon={<Icon icon={Info} size="sm" />} showIcon variant="positive">
        Estimate
      </StatusBadge>,
    );
    expect(container.querySelectorAll("svg")).toHaveLength(1);
    expect(container.querySelector("svg")?.getAttribute("class")).toContain("lucide-info");
  });

  it("keeps every existing variant renderable", () => {
    for (const variant of ["positive", "warning", "danger", "info", "neutral", "brand"] as const) {
      const { unmount } = render(<StatusBadge variant={variant}>{variant}</StatusBadge>);
      expect(screen.getByText(variant)).toBeDefined();
      unmount();
    }
  });
});
