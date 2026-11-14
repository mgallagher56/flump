import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ToolBreadcrumbs } from "./ToolBreadcrumbs";

describe("ToolBreadcrumbs", () => {
  it("links back to /tools and marks the current page, with no category crumb", () => {
    render(<ToolBreadcrumbs title="Payoff calculator" />);
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(
      within(nav)
        .getByRole("link", { name: /All calculators/ })
        .getAttribute("href"),
    ).toBe("/tools");
    expect(within(nav).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Payoff calculator").getAttribute("aria-current")).toBe("page");
  });

  it("uses the app's link renderer", () => {
    render(
      <ToolBreadcrumbs
        renderLink={(href, className, children) => (
          <a className={className} data-router="" href={`/app${href}`}>
            {children}
          </a>
        )}
        title="Demo"
      />,
    );
    const link = screen.getByRole("link", { name: /All calculators/ });
    expect(link.getAttribute("href")).toBe("/app/tools");
    expect(link.hasAttribute("data-router")).toBe(true);
  });
});
