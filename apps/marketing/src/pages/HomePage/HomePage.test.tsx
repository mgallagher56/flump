import { expectPageRules } from "@repo/ui/testing";
import { render, screen, waitFor, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { HomePage } from "./HomePage";

const renderHome = () =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </HelmetProvider>,
  );

const main = () => screen.getByRole("main");

describe("Marketing HomePage (E16 PR 12)", () => {
  it("has a hero with one h1, one sentence and the example preview", () => {
    renderHome();
    expect(
      screen.getByRole("heading", { level: 1, name: "See where you stand each month" }),
    ).toBeDefined();
    expect(screen.getByText(/^Enter a few rough numbers/)).toBeDefined();
    const preview = screen.getByTestId("baseline-snapshot-preview");
    expect(within(preview).getByText("Example")).toBeDefined();
    const sample = within(main()).getByRole("link", { name: /Try sample data/ });
    expect(sample.getAttribute("href")).toContain("/sandbox");
  });

  it("keeps the hero inside the first-view number budget with one primary button", () => {
    renderHome();
    expectPageRules(screen.getByTestId("home-hero"), { maxFigures: 3, projectionNotices: 0 });
    // One hero block (the preview's net worth) and one notice on the page. The two invite bands
    // (hero and the final band) each hold one primary button.
    expect(main().querySelectorAll('[data-tone="hero"]')).toHaveLength(1);
    expect(main().querySelectorAll('[data-notice="projection"]')).toHaveLength(1);
    expectPageRules(screen.getByTestId("home-final-cta"), { projectionNotices: 0 });
  });

  it("has five bands: hero, what you can see, pay rise, security, then FAQ with the final CTA", () => {
    const { container } = renderHome();
    const sections = Array.from(main().children).filter((el) => el.tagName === "SECTION");
    expect(sections.map((s) => s.id || s.getAttribute("data-testid"))).toEqual([
      "home-hero",
      "what-you-can-see",
      "pay-rise",
      "security",
      "faq",
    ]);
    // The final call to action sits inside the FAQ band, which is the page's one sage band.
    const faq = container.querySelector("#faq") as HTMLElement;
    expect(faq.getAttribute("data-tone-band")).toBe("sage");
    expect(within(faq).getByTestId("home-final-cta").id).toBe("get-started");
    expect(
      within(screen.getByTestId("home-final-cta"))
        .getByRole("link", { name: "Request an invite" })
        .getAttribute("data-variant"),
    ).toBe("primary");
    expect(
      screen.getByRole("heading", { level: 3, name: "Ready to see where you stand?" }),
    ).toBeDefined();
    // At most one sage and one apricot band (D16 b).
    expect(container.querySelectorAll('[data-tone-band="sage"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-tone-band="apricot"]')).toHaveLength(1);
  });

  it("states the tagline in the title, never in the h1", async () => {
    renderHome();
    await waitFor(() => expect(document.title).toBe("Flump: finance without the fog"));
    expect(screen.getByRole("heading", { level: 1 }).textContent).not.toMatch(/fog/i);
  });

  it("shows 'Request an invite' exactly twice in the page body: hero and end", () => {
    renderHome();
    const invites = within(main()).getAllByRole("link", { name: "Request an invite" });
    expect(invites).toHaveLength(2);
    expect(within(screen.getByTestId("home-hero")).getByText("Request an invite")).toBeDefined();
    expect(
      within(screen.getByTestId("home-final-cta")).getByText("Request an invite"),
    ).toBeDefined();
  });

  it("has no MCP section, code block, monospace pill or off-system colour (D13)", () => {
    renderHome();
    const body = main();
    expect(body.querySelector("code, pre")).toBeNull();
    // The slider sets its own fill as a CSS variable; nothing else carries an inline style.
    expect(body.querySelector("[style]:not(input[type=range])")).toBeNull();
    expect(body.innerHTML).not.toMatch(/rgba\(|#[0-9a-f]{6}|mono/i);
    expect(body.textContent ?? "").not.toMatch(/Model Context Protocol|MCP server|Local CLI/);
    // The one MCP mention is the FAQ answer, and the footer links the page.
    expect(screen.getByRole("button", { name: /AI assistant/ })).toBeDefined();
    expect(screen.getByRole("contentinfo").querySelector('a[href="/mcp"]')).not.toBeNull();
  });

  it("keeps the £100k tax trap out of the home page body", () => {
    renderHome();
    expect(main().textContent ?? "").not.toMatch(/tax trap|60%|£100k/i);
  });

  it("promises no bank feed or connection and makes no regulatory claim", () => {
    const { container } = renderHome();
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/bank feed|bank connection|coming soon|Open Banking/i);
    expect(text).not.toMatch(/AISP|PISP|FCA-regulated/);
  });
});
