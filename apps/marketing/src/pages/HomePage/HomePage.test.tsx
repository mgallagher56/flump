import { render, screen, waitFor, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { HOME_FAQS } from "../../components/HomeFAQ";
import { HomePage } from "./HomePage";

const page = (
  <HelmetProvider>
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  </HelmetProvider>
);

const renderHome = () => render(page);
const main = () => screen.getByRole("main");

/** The server's HTML, as a browser with no JavaScript gets it (MK1). */
const serverMain = () => {
  const doc = new DOMParser().parseFromString(renderToString(page), "text/html");
  return doc.querySelector("main") as HTMLElement;
};

const JOURNEY_STOPS = [
  "Accounts and net worth",
  "Budget and breathing room",
  "Take-home pay and Self Assessment",
  "Savings and pension",
  "Debt and borrowing",
  "Where you stand, on one page",
];

describe("Marketing HomePage (ROLLOUT-PLAN M1, prototype 11)", () => {
  it("has the decided h1 and lead, both calls to action and the example picture in the hero", () => {
    renderHome();
    const hero = within(screen.getByTestId("home-hero"));
    expect(
      hero.getByRole("heading", { level: 1, name: "All your money. One clear picture." }),
    ).toBeDefined();
    expect(
      hero.getByText("Accounts, budget, pay, savings, pension and debts in one place."),
    ).toBeDefined();
    expect(hero.getByRole("heading", { level: 2, name: "Monthly picture" })).toBeDefined();
    expect(hero.getAllByText("Example").length).toBeGreaterThanOrEqual(1);
    const preview = hero.getByRole("link", { name: "Interactive preview" });
    expect(preview.getAttribute("href")).toBe("/preview");
    expect(document.querySelector('a[href*="/sandbox"]')).toBeNull();
  });

  it("orders the bands hero, features, journey, rough figures, pay rise, security, the pair, close", () => {
    renderHome();
    const bands = Array.from(main().children);
    expect(bands.map((el) => el.id || el.getAttribute("data-testid") || el.tagName)).toEqual([
      "home-hero",
      "features",
      "journey",
      "rough-figures",
      "pay-rise",
      "security",
      "DIV",
      "get-started",
    ]);
    // More detail beside the questions: card and canvas stacked, one card band side by side.
    const pair = Array.from(bands[6]?.children ?? []);
    expect(pair.map((s) => [s.id, s.getAttribute("data-tone-band")])).toEqual([
      ["more-detail", "card"],
      ["faq", "canvas"],
    ]);
  });

  it("uses prototype 11's card and canvas tones with no solid band anywhere", () => {
    renderHome();
    // The journey's own tone is the journey's (HomeJourney); these are the bands around it.
    const tones = Array.from(main().children)
      .slice(1)
      .filter((el) => el.id !== "journey")
      .map((el) => el.getAttribute("data-tone-band") ?? "pair");
    // Prototype 11: security, More detail and the close follow its tones, not strict alternation.
    expect(tones).toEqual(["card", "card", "canvas", "card", "pair", "canvas"]);
    // The owner's rulings: no solid mint band, no dark closing band, no tinted band.
    expect(main().querySelector('[data-tone-band="hero"], [data-tone-band="contrast"]')).toBeNull();
    expect(main().querySelector('[data-tone-band="teal"]')).toBeNull();
  });

  it("marks every band as a stop for the section control, each labelled by its heading", () => {
    renderHome();
    const stops = Array.from(main().querySelectorAll<HTMLElement>("[data-home-section]"));
    const outsideJourney = stops.filter((stop) => !stop.closest("#journey"));
    expect(outsideJourney.map((stop) => stop.getAttribute("data-home-section-name"))).toEqual([
      "One picture",
      "Five areas",
      "Rough figures",
      "Pay rise",
      "Security",
      "More detail",
      "Questions",
      "Get started",
    ]);
    for (const stop of stops) {
      expect(stop.id, stop.getAttribute("data-home-section-name") ?? "").not.toBe("");
      const heading = document.getElementById(stop.getAttribute("aria-labelledby") ?? "");
      expect(heading?.tagName).toMatch(/^H[1-3]$/);
    }
    // The section control is mounted after hydration, with the pause control beside it.
    const control = screen.getByRole("navigation", { name: "Sections" });
    expect(
      control.closest("[data-stop-control]")?.querySelector("[data-motion-control]"),
    ).not.toBeNull();
  });

  it("states the tagline in the title, never in the h1", async () => {
    renderHome();
    await waitFor(() => expect(document.title).toBe("Flump: finance without the fog"));
    expect(screen.getByRole("heading", { level: 1 }).textContent).not.toMatch(/fog/i);
  });

  // Three, following prototype 11: the hero, the journey's last stop and the close. The owner's
  // ruling on repeated calls to action is pending.
  it("shows 'Request an invite' exactly three times in the page body: hero, last stop and close", () => {
    renderHome();
    expect(within(main()).getAllByRole("link", { name: "Request an invite" })).toHaveLength(3);
    expect(
      within(screen.getByTestId("home-hero")).getByRole("link", { name: "Request an invite" }),
    ).toBeDefined();
    const lastStop = screen.getByRole("region", { name: "Where you stand, on one page" });
    expect(within(lastStop).getByRole("link", { name: "Request an invite" })).toBeDefined();
    const close = within(screen.getByTestId("home-final-cta"));
    expect(
      close.getByRole("link", { name: "Request an invite" }).getAttribute("data-variant"),
    ).toBe("primary");
    expect(
      close.getByRole("heading", { level: 2, name: "Ready to see where you stand?" }),
    ).toBeDefined();
  });

  it("shows the five area tiles and the AI connection tile, each linked to its page", () => {
    renderHome();
    const tiles = within(screen.getByRole("list", { name: "Flump features" }));
    expect(tiles.getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual([
      "/features/accounts",
      "/features/budget",
      "/features/pay",
      "/features/savings-and-pension",
      "/features/debt-and-borrowing",
      "/features/ai-connection",
    ]);
    expect(tiles.getByText("Switched on for an account on request during testing.")).toBeDefined();
    expect(
      screen.getByRole("link", { name: "All Flump features on one page" }).getAttribute("href"),
    ).toBe("/features");
  });

  it("lists the six journey stops in reading order as sections, the last linking to the preview", () => {
    renderHome();
    const journeyEl = main().querySelector("#journey") as HTMLElement;
    const journey = within(journeyEl);
    // Prototype 11: the journey's heading, then each stop as its own section headed at level 2.
    expect(journey.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "From rough figures to one picture",
      ...JOURNEY_STOPS,
    ]);
    expect(journey.getAllByRole("region").map((r) => r.getAttribute("aria-labelledby"))).toEqual(
      journey
        .getAllByRole("heading", { level: 2 })
        .slice(1)
        .map((h) => h.id),
    );
    // The first five link to their area pages; the last ends on the two calls to action.
    const lastStop = within(journey.getByRole("region", { name: "Where you stand, on one page" }));
    expect(lastStop.getByRole("link", { name: "Interactive preview" }).getAttribute("href")).toBe(
      "/preview",
    );
    expect(journey.getAllByRole("link", { name: "Request an invite" })).toHaveLength(1);
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

  it("serves the whole page in reading order with no JavaScript: journey, every tile, every answer (MK1)", () => {
    const html = serverMain();
    const text = html.textContent ?? "";
    const order = [
      "All your money. One clear picture.",
      "Flump features",
      "From rough figures to one picture",
      ...JOURNEY_STOPS,
      "Start with rough figures",
      "What you keep from a pay rise",
      "Security and privacy",
      "More detail when you want it",
      "Frequently asked questions",
      "Ready to see where you stand?",
    ];
    // Each heading is found after the one before it (a tile may repeat an area's name earlier).
    let from = 0;
    for (const heading of order) {
      const index = text.indexOf(heading, from);
      expect(index, `"${heading}" after position ${from}`).toBeGreaterThanOrEqual(from);
      from = index + heading.length;
    }
    expect(html.querySelectorAll('[aria-label="Flump features"] > li')).toHaveLength(6);
    for (const faq of HOME_FAQS) {
      expect(text).toContain(faq.q);
      // Every answer is in the page, open or not, so it reads and finds without script.
      const answer = html.querySelector(`#faq-answer-${faq.id}`);
      expect(answer?.textContent?.length ?? 0, faq.id).toBeGreaterThan(20);
    }
    // Sample figures are at their final value in the HTML, never part-way (MK10).
    expect(text).toContain("£232,000");
  });

  it("has no MCP section, code block, monospace pill, inline style or off-system colour (D13)", () => {
    renderHome();
    expect(main().querySelector("code, pre")).toBeNull();
    // In the server HTML only the pay rise sliders carry an inline style (their fill, a CSS
    // variable). In the browser the tilt-and-light hover (useTiltLight) writes only its own CSS
    // variables after mount.
    expect(serverMain().querySelector("[style]:not(input[type=range])")).toBeNull();
    for (const el of main().querySelectorAll("[style]")) {
      expect(el.getAttribute("style")).toMatch(/^(--[\w-]+: [^;]+;\s*)+$/);
    }
    expect(main().innerHTML).not.toMatch(/rgba\(|#[0-9a-f]{6}|mono/i);
    expect(main().textContent ?? "").not.toMatch(/Model Context Protocol|MCP server|Local CLI/);
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

  it("draws every picture as decoration: document pictures, hidden from assistive technology", () => {
    const { container } = renderHome();
    const scenes = [...container.querySelectorAll("svg[data-scene]")];
    expect(scenes.map((svg) => svg.getAttribute("data-scene"))).toEqual([
      "feature-accounts",
      "feature-budget",
      "feature-pay",
      "feature-savings-pension",
      "feature-debt",
      "feature-ai-connection",
      "check-in",
      "security",
      "onboarding",
    ]);
    for (const svg of scenes) expect(svg.getAttribute("aria-hidden")).toBe("true");
  });
});
