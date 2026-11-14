import { BUSINESS_DETAILS, formatPrice } from "@flump/business-details";
import { expectPageRules } from "@repo/ui/testing";
import { TOOL_CATALOGUE } from "@repo/ui/tools";
import { render, screen, waitFor, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PRICE_NOT_SET } from "../../utils/pricing";
import { signupCta } from "../../utils/site";
import { BETA_FEATURES, BETA_STATEMENT, PricingPage } from "./PricingPage";

const renderPage = () =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <PricingPage />
      </MemoryRouter>
    </HelmetProvider>,
  );

afterEach(() => {
  vi.unstubAllEnvs();
});

const placeholderFigures = [
  formatPrice(BUSINESS_DETAILS.price.value.monthly),
  formatPrice(BUSINESS_DETAILS.price.value.annual),
  "£4.99",
];

describe("PricingPage (D10 b)", () => {
  it("states one pricing position: free during the beta, nothing charged, price not set", () => {
    const { container } = renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Pricing" })).toBeDefined();
    expect(screen.getByText(BETA_STATEMENT)).toBeDefined();
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/not been announced|Free today|free, invite-only/i);
    // "Free" only ever appears as "free during the beta" (ruling 4).
    for (const match of text.matchAll(/free[^.]*/gi))
      expect(match[0]).toMatch(/free during the beta/i);
  });

  it("puts the beta plan first and the paid plan as one quiet card", () => {
    const { container } = renderPage();
    const plans = Array.from(container.querySelectorAll("[data-plan]"));
    expect(plans.map((p) => p.getAttribute("data-plan"))).toEqual(["beta", "paid"]);
    expect(
      within(plans[0] as HTMLElement).getByRole("heading", { name: "Free during the beta" }),
    ).toBeDefined();
    expect(within(plans[0] as HTMLElement).queryByText("Beta")).toBeNull();
    expect(within(plans[1] as HTMLElement).getByText(PRICE_NOT_SET)).toBeDefined();
    expect(within(plans[1] as HTMLElement).queryByRole("button")).toBeNull();
    expect(within(plans[1] as HTMLElement).queryByRole("link")).toBeNull();
  });

  it("has no billing toggle and no example price anywhere", () => {
    const { container } = renderPage();
    expect(screen.queryByRole("switch")).toBeNull();
    const text = container.textContent ?? "";
    for (const figure of placeholderFigures) expect(text).not.toContain(figure);
    expect(text).not.toMatch(/per month|per year|billed annually|Example figure only/i);
  });

  it("asks for an invite through the shared sign-up CTA, the page's one primary button", () => {
    renderPage();
    const main = screen.getByRole("main");
    const link = within(main).getByRole("link", { name: "Request an invite" });
    expect(link.getAttribute("href")).toBe(signupCta().href);
    expect(within(main).queryByText("Get started")).toBeNull();
    expect(main.querySelector('a[href$="/signUp"], a[href$="/signup"]')).toBeNull();
    expectPageRules(main, { projectionNotices: 0 });
  });

  it("lists three short benefits, claims only shipped features and promises no bank feed", () => {
    const { container } = renderPage();
    const items = within(container.querySelector('[data-plan="beta"]') as HTMLElement).getAllByRole(
      "listitem",
    );
    expect(items.map((li) => li.textContent)).toEqual([...BETA_FEATURES]);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/CSV|auto-categorisation|FCA|real-time|trial|Pro\b|No credit card/i);
    expect(text).not.toMatch(/bank connection|bank feed|coming soon|planned/i);
    // The calculator list lives on /tools, not here.
    for (const tool of TOOL_CATALOGUE) expect(screen.queryByText(tool.title)).toBeNull();
  });

  it("has no FCA or Open Banking claim in title or meta", async () => {
    renderPage();
    await waitFor(() => expect(document.title).toContain("Pricing"));
    const description = document.querySelector('meta[name="description"]')?.getAttribute("content");
    expect(document.title).not.toMatch(/FCA|Open Banking|Pro/);
    expect(description).not.toMatch(/FCA|Open Banking|trial/i);
    expect(description).toMatch(/free during the beta/);
  });

  describe("launch state with the price not set", () => {
    it("renders the beta plan only", () => {
      vi.stubEnv("VITE_SHOW_PAID_PLAN", "false");
      const { container } = renderPage();
      expect(screen.queryByText("Paid plan")).toBeNull();
      expect(container.querySelectorAll("[data-plan]")).toHaveLength(1);
      expect(screen.getByRole("heading", { name: "Free during the beta" })).toBeDefined();
      expect(within(screen.getByRole("main")).getByText("Request an invite")).toBeDefined();
    });
  });
});
