import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageHeader } from "./PageHeader";

describe("PageHeader Pattern", () => {
  it("renders title, subtitle, and action slot", () => {
    render(
      <PageHeader
        actions={<button type="button">Connect Bank</button>}
        subtitle="Track cash ISAs and workplace pensions"
        title="Accounts & Balances"
      />,
    );
    expect(screen.getByText("Accounts & Balances")).toBeDefined();
    expect(screen.getByText("Track cash ISAs and workplace pensions")).toBeDefined();
    expect(screen.getByRole("button", { name: "Connect Bank" })).toBeDefined();
  });

  it("renders the title as the page h1", () => {
    render(<PageHeader title="Home" />);
    expect(screen.getByRole("heading", { level: 1, name: "Home" })).toBeDefined();
  });

  it("prefers description over the deprecated subtitle", () => {
    render(<PageHeader description="Where you stand this month." subtitle="Old" title="Home" />);
    expect(screen.getByText("Where you stand this month.")).toBeDefined();
    expect(screen.queryByText("Old")).toBeNull();
  });

  it("renders a string badge as a pill and passes nodes through", () => {
    const { rerender } = render(<PageHeader badge="Sample data" title="Home" />);
    expect(screen.getByText("Sample data")).toBeDefined();
    rerender(<PageHeader badge={<span>Custom badge</span>} title="Home" />);
    expect(screen.getByText("Custom badge")).toBeDefined();
  });

  it("omits the aside when there is no badge or action", () => {
    const { container } = render(<PageHeader title="Home" />);
    expect(container.querySelector("header")?.children.length).toBe(1);
  });
});
