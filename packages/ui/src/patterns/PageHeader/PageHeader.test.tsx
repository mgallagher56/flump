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

  it("below md, puts the h1 beside the actions and the description under both", () => {
    const { container } = render(
      <PageHeader
        actions={<button type="button">Edit</button>}
        description="About"
        title="Budget"
      />,
    );
    const header = container.querySelector("header") as HTMLElement;
    expect(header.className).toContain("flex-wrap_wrap");
    // The description is ordered after the actions and takes a full line of its own.
    const description = screen.getByText("About");
    expect(description.className).toContain("order_3");
    expect(description.className).toContain("flex-b_100%");
    // The h1 grows but never shrinks, so actions that do not fit wrap instead of crushing it.
    const h1 = screen.getByRole("heading", { level: 1 }).className;
    expect(h1).toContain("flex_1_1_auto");
    // A long title wraps rather than running off a phone screen.
    expect(h1).toContain("min-w_0");
    expect(h1).toContain("ov-wrap_anywhere");
  });

  it("omits the aside when there is no badge or action", () => {
    const { container } = render(<PageHeader title="Home" />);
    expect(container.querySelector("header")?.children.length).toBe(1);
  });
});
