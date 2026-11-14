import { getToolEntry } from "@repo/ui/tools";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ToolTile } from "./ToolTile";

vi.mock("react-router", () => ({
  Link: ({ children, to, className }: { children: ReactNode; to: string; className?: string }) => (
    <a className={className} href={to}>
      {children}
    </a>
  ),
}));

describe("ToolTile", () => {
  it("links to the calculator with its title and description", () => {
    const tool = getToolEntry("uk-debt-snowball-vs-avalanche-calculator");
    const { container } = render(<ToolTile tool={tool} />);
    expect(screen.getByRole("link").getAttribute("href")).toBe(`/tools/${tool.slug}`);
    expect(screen.getByRole("heading", { level: 2, name: tool.title })).toBeDefined();
    expect(screen.getByText(tool.description)).toBeDefined();
    expect(screen.getByText(/Open calculator/)).toBeDefined();
    // The icon sits in the domain IconTile (debt is apricot), with no eyebrow above the title.
    expect(container.querySelector('[data-domain="debt"]')?.getAttribute("aria-hidden")).toBe(
      "true",
    );
  });
});
