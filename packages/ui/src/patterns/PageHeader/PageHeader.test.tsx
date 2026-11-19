import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageHeader } from "./PageHeader";
import { SHORT_VIEWPORT } from "./PageHeader.styles";

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

  it("below md, wraps: h1, then the description, then the actions on their own row", () => {
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
    // Order: h1, then the description on a row of its own, then the actions (phone sweep 4), so
    // wrapped actions never sit between the h1 and its description. From md they sit beside.
    expect(h1).toContain("order_1");
    const about = screen.getByText("About").className;
    expect(about).toContain("order_5");
    expect(about).toContain("flex-b_100%");
    const aside = (screen.getByRole("button", { name: "Edit" }).parentElement as HTMLElement)
      .className;
    expect(aside).toContain("order_6");
    expect(aside).toContain("md:order_2");
    expect(aside).toContain("flex-b_100%");
    expect(aside).toContain("md:flex-b_auto");
    expect(aside).toContain("max-w_100%");
  });

  it("with no description, keeps the actions beside the h1 (order 2) on a phone", () => {
    render(<PageHeader actions={<button type="button">Add</button>} title="Debt" />);
    const aside = (screen.getByRole("button", { name: "Add" }).parentElement as HTMLElement)
      .className;
    expect(aside).toContain("order_2");
    expect(aside).not.toContain("order_6");
    expect(aside).not.toContain("flex-b_100%");
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
    // Hidden on a phone at large text, where it would crowd the description (P49): a rem
    // container query on the header, since an em media query never sees the root text size.
    expect(art.className).toContain("[@container_page-header_(max-width:_15.99rem)]:d_none");
    const header = container.querySelector("header") as HTMLElement;
    expect(header.className).toContain("cq-t_inline-size");
    expect(header.className).toContain("cq-n_page-header");
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

  it("goes compact on a short landscape touch screen only, not a short desktop window (P78)", () => {
    // The query needs a coarse pointer, so a short desktop window keeps the full header.
    expect(SHORT_VIEWPORT).toBe(
      "@media screen and (max-height: 479.98px) and (orientation: landscape) and (pointer: coarse)",
    );
    render(
      <PageHeader
        actions={<button type="button">Add</button>}
        description="Everything you own and owe, in one place."
        illustration="empty-accounts"
        title="Your accounts"
      />,
    );
    const q =
      "[@media_screen_and_(max-height:_479.98px)_and_(orientation:_landscape)_and_(pointer:_coarse)]";
    // The description leaves sight but stays in the accessibility tree (visually hidden, not
    // display none), so a screen reader still hears it.
    const description = screen.getByText("Everything you own and owe, in one place.");
    expect(description.className).not.toContain(`${q}:d_none`);
    expect(description.className).toContain(`${q}:pos_absolute`);
    expect(description.className).toContain(`${q}:w_1px`);
    expect(description.className).toContain(`${q}:h_1px`);
    expect(description.className).toContain(`${q}:ov_hidden`);
    expect(screen.getByRole("banner").contains(description)).toBe(true);
    expect(screen.getByTestId("page-header-illustration").className).toContain(`${q}:d_none`);
    expect(screen.getByRole("heading", { level: 1 }).className).toContain(
      `${q}:textStyle_heading.lg`,
    );
  });
});
