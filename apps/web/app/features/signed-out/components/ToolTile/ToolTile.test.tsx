import { render, screen } from "@testing-library/react";
import { Flame } from "lucide-react";
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
    render(
      <ToolTile
        tool={{
          slug: "demo",
          shortTitle: "Demo",
          title: "Demo calculator",
          description: "Does a thing.",
          icon: Flame,
        }}
      />,
    );
    expect(screen.getByRole("link").getAttribute("href")).toBe("/tools/demo");
    expect(screen.getByRole("heading", { level: 2, name: "Demo calculator" })).toBeDefined();
    expect(screen.getByText("Does a thing.")).toBeDefined();
    expect(screen.getByText(/Open calculator/)).toBeDefined();
  });
});
