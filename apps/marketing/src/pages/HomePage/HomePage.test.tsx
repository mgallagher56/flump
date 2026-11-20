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

describe("Marketing HomePage (E16 PR 12, E42 S5)", () => {
  it("has a hero with the decided h1 and lead (D2) and the example preview", () => {
    renderHome();
    expect(
      screen.getByRole("heading", { level: 1, name: "All your money. One clear picture." }),
    ).toBeDefined();
    expect(
      screen.getByText("Accounts, budget, pay, savings, pension and debts in one place."),
    ).toBeDefined();
    const preview = screen.getByTestId("baseline-snapshot-preview");
    expect(within(preview).getByText("Example")).toBeDefined();
    // /sandbox now redirects to sign-up, so the second hero button opens the interactive preview.
    const tryIt = within(main()).getByRole("link", { name: "Interactive preview" });
    expect(tryIt.getAttribute("href")).toBe("/preview");
    expect(tryIt.getAttribute("target")).toBeNull();
    expect(document.querySelector('a[href*="/sandbox"]')).toBeNull();
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

  it("has the E42 bands: hero, features, rough figures, more detail, pay rise, security, then FAQ with the final CTA", () => {
    const { container } = renderHome();
    const sections = Array.from(main().children).filter((el) => el.tagName === "SECTION");
    expect(sections.map((s) => s.id || s.getAttribute("data-testid"))).toEqual([
      "home-hero",
      "features",
      "rough-figures",
      "more-detail",
      "pay-rise",
      "security",
      "faq",
    ]);
    // D1: the band is "Flump features", never "What Flump covers".
    expect(screen.getByRole("heading", { level: 2, name: "Flump features" })).toBeDefined();
    expect(container.textContent ?? "").not.toMatch(/what flump covers/i);
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
    // P74: the FAQ heading starts at the left, like every other band's heading.
    const faqHeader = within(faq).getByRole("heading", { level: 2 }).parentElement as HTMLElement;
    expect(faqHeader.className).toContain("ta_left");
    expect(faqHeader.className).not.toContain("ta_center");
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

  it("shows the five area tiles and the AI connection tile, each linked to its page", () => {
    renderHome();
    const tiles = within(screen.getByRole("region", { name: "Flump features" })).getByRole("list", {
      name: "Flump features",
    });
    expect(
      within(tiles)
        .getAllByRole("link")
        .map((a) => a.getAttribute("href")),
    ).toEqual([
      "/features/accounts",
      "/features/budget",
      "/features/pay",
      "/features/savings-and-pension",
      "/features/debt-and-borrowing",
      "/features/ai-connection",
    ]);
    expect(
      within(tiles).getByText("Switched on for an account on request during testing."),
    ).toBeDefined();
    expect(
      screen.getByRole("link", { name: "All Flump features on one page" }).getAttribute("href"),
    ).toBe("/features");
  });

  it("starts with rough figures, then offers more detail, each linked to its area", () => {
    renderHome();
    const steps = within(screen.getByRole("region", { name: "Start with rough figures" }));
    expect(steps.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Enter rough figures",
      "See where you stand",
      "Check in once a month",
    ]);
    const detail = within(screen.getByRole("region", { name: "More detail when you want it" }));
    expect(detail.getAllByRole("link").map((a) => [a.textContent, a.getAttribute("href")])).toEqual(
      [
        ["About pay in Flump", "/features/pay"],
        ["About savings and pension in Flump", "/features/savings-and-pension"],
        ["About debt and borrowing in Flump", "/features/debt-and-borrowing"],
        ["About accounts in Flump", "/features/accounts"],
      ],
    );
  });

  it("links the pay rise tool to the Pay page, and links no calculator page", () => {
    const { container } = renderHome();
    const payRise = within(container.querySelector("#pay-rise") as HTMLElement);
    expect(payRise.getByRole("link", { name: "About pay in Flump" }).getAttribute("href")).toBe(
      "/features/pay",
    );
    expect(container.querySelector('a[href^="/tools"], a[href^="/mcp"]')).toBeNull();
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
    expect(
      screen.getByRole("contentinfo").querySelector('a[href="/features/ai-connection"]'),
    ).not.toBeNull();
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

  it("adds illustrations only where no figure follows, and none in the hero", () => {
    const { container } = renderHome();
    const scenes = [...container.querySelectorAll("svg[data-scene]")];
    expect(scenes.map((svg) => svg.getAttribute("data-scene"))).toEqual(["check-in", "onboarding"]);
    expect(screen.getByTestId("home-hero").querySelector("svg[data-scene]")).toBeNull();
    for (const svg of scenes) expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(
      within(screen.getByTestId("home-final-cta")).getByTestId("home-final-cta-illustration"),
    ).toBeDefined();
  });
});
