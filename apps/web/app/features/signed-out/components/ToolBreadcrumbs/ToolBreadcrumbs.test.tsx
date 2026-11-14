import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ToolBreadcrumbs } from "./ToolBreadcrumbs";

vi.mock("react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

describe("ToolBreadcrumbs", () => {
  it("links back to /tools and marks the current page", () => {
    render(<ToolBreadcrumbs title="Payoff calculator" />);
    expect(screen.getByRole("link", { name: /All calculators/ }).getAttribute("href")).toBe(
      "/tools",
    );
    // Two crumbs only: All calculators, then the tool (no category crumb).
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Payoff calculator").getAttribute("aria-current")).toBe("page");
  });
});
