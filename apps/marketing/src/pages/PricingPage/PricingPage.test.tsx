import { BUSINESS_DETAILS, formatPrice } from "@flump/business-details";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PricingPage } from "./PricingPage";

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

describe("PricingPage", () => {
  it("states the free, invite-only beta and that nothing is charged", () => {
    const { container } = renderPage();
    expect(container.textContent).toMatch(/free, invite-only beta/i);
    expect(container.textContent).toMatch(/Nothing is charged/);
    expect(container.textContent).toMatch(/price is not set/);
    expect(screen.getByRole("heading", { level: 1, name: "Pricing" })).toBeDefined();
    expect(screen.getByText("Free today")).toBeDefined();
  });

  it("does not claim a trial, Pro tier or no-card promise", () => {
    const { container } = renderPage();
    expect(container.textContent).not.toMatch(/trial|Pro\b|No credit card/i);
  });

  it("asks for an invite by email, not a closed sign-up link", () => {
    renderPage();
    const link = screen.getByText("Request an invite").closest("a");
    expect(link?.getAttribute("href")).toContain(`mailto:${BUSINESS_DETAILS.supportEmail.value}`);
    const main = screen.getByRole("main");
    expect(within(main).queryByText("Get started")).toBeNull();
    expect(main.querySelector('a[href$="/signUp"], a[href$="/signup"]')).toBeNull();
  });

  it("keeps the paid CTA disabled and not a link", () => {
    renderPage();
    const cta = screen.getByText("Pricing coming soon") as HTMLButtonElement;
    expect(cta.closest("a")).toBeNull();
    expect(cta.disabled).toBe(true);
  });

  it("switches the placeholder price with the billing toggle", () => {
    renderPage();
    const toggle = screen.getByRole("switch", { name: "Annual billing" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText("£4.99")).toBeDefined();
    expect(screen.getByText("per month")).toBeDefined();
    expect(screen.getByText("Introductory price, subject to change")).toBeDefined();
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("£49")).toBeDefined();
    expect(screen.getByText("per year, billed annually")).toBeDefined();
  });

  it("claims only shipped features", () => {
    const { container } = renderPage();
    expect(container.textContent).not.toMatch(/CSV|auto-categorisation|FCA|real-time/i);
    expect(screen.getByText("Section 24 landlord tax calculator")).toBeDefined();
    expect(screen.getByText("£100k–£125k tax trap and childcare calculator")).toBeDefined();
    expect(container.textContent).not.toMatch(/30-year|£0|per month, free/i);
  });

  it("has no FCA or Open Banking claim in title or meta", async () => {
    renderPage();
    await waitFor(() => expect(document.title).toContain("Pricing"));
    const description = document.querySelector('meta[name="description"]')?.getAttribute("content");
    expect(document.title).not.toMatch(/FCA|Open Banking|Pro/);
    expect(description).not.toMatch(/FCA|Open Banking|trial/i);
    expect(description).toMatch(/free, invite-only beta/);
  });

  describe("launch state with the price not set", () => {
    it("renders no paid card, no toggle and no price", () => {
      vi.stubEnv("VITE_SHOW_PAID_PLAN", "false");
      const { container } = renderPage();
      expect(screen.queryByRole("switch")).toBeNull();
      expect(screen.queryByText("Paid plan")).toBeNull();
      expect(screen.queryByText("Pricing coming soon")).toBeNull();
      const text = container.textContent ?? "";
      expect(text).not.toContain(formatPrice(BUSINESS_DETAILS.price.value.monthly));
      expect(text).not.toContain(formatPrice(BUSINESS_DETAILS.price.value.annual));
      expect(text).not.toMatch(/£X|£Y|Introductory price/);
      expect(screen.getByText("Free today")).toBeDefined();
      expect(screen.getByText("Request an invite")).toBeDefined();
    });
  });
});
