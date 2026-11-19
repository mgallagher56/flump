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

  it("below md, wraps: the actions drop under the h1 when both do not fit (P01, P02, P03)", () => {
    const { container } = render(
      <PageHeader
        actions={<button type="button">Edit</button>}
        description="About"
        title="Budget"
      />,
    );
    const header = container.querySelector("header") as HTMLElement;
    // A wrapping flex row, not a grid whose min-content column lets the action overlap the h1.
    expect(header.className).toContain("d_flex");
    expect(header.className).toContain("flex-wrap_wrap");
    expect(header.className).not.toContain("d_grid");
    const h1 = screen.getByRole("heading", { level: 1 }).className;
    // The h1 asks for its one-line width and may shrink to the screen, never past it.
    expect(h1).toContain("flex_1_1_auto");
    expect(h1).toContain("min-w_0");
    expect(h1).toContain("ov-wrap_break-word");
    // Order: h1, then the actions, then the description on a row of its own.
    expect(h1).toContain("order_1");
    const aside = screen.getByRole("button", { name: "Edit" }).parentElement as HTMLElement;
    expect(aside.className).toContain("order_2");
    expect(aside.className).toContain("max-w_100%");
    expect(screen.getByText("About").className).toContain("flex-b_100%");
  });

  it("puts the page icon on the description's row, still and decorative, and none unless asked", () => {
    const { container, rerender } = render(
      <PageHeader
        actions={<button type="button">Add</button>}
        description="Pots"
        illustration="empty-savings"
        title="Your savings"
      />,
    );
    const art = screen.getByTestId("page-header-illustration");
    // A full-width break ends the h1 row, then the icon and the description share the next.
    expect(container.querySelector("header")?.className).toContain("after:flex-b_100%");
    expect(art.className).toContain("order_4");
    expect(screen.getByText("Pots").className).toContain("order_5");
    expect(screen.getByText("Pots").className).toContain("flex_1_1_0");
    // The same size on every page: 40px below md, 64px from md.
    expect(art.className).toContain("w_10");
    expect(art.className).toContain("md:w_16");
    // Hidden on a phone at large text, where it would crowd the description (P49).
    expect(art.className).toContain("[@media_screen_and_(max-width:_19.99em)]:d_none");
    const svg = art.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.getAttribute("data-scene")).toBe("empty-savings");
    expect(svg?.hasAttribute("data-scene-settle")).toBe(false);
    rerender(<PageHeader title="Your savings" />);
    expect(screen.queryByTestId("page-header-illustration")).toBeNull();
  });

  it("with no description, puts the icon before the h1 instead of on a row of its own (P50)", () => {
    const { container } = render(<PageHeader illustration="empty-savings" title="Debt" />);
    const art = screen.getByTestId("page-header-illustration");
    expect(art.className).toContain("order_0");
    expect(art.className).not.toContain("order_4");
    expect(container.querySelector("header")?.className).not.toContain("after:");
  });

  it("omits the aside when there is no badge or action", () => {
    const { container } = render(<PageHeader title="Home" />);
    expect(container.querySelector("header")?.children.length).toBe(1);
  });
});
