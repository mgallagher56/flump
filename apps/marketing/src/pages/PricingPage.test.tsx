import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { PricingPage } from "./PricingPage";

const renderPage = () =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <PricingPage />
      </MemoryRouter>
    </HelmetProvider>,
  );

describe("PricingPage", () => {
  it("links the free plan to sign-up without a plan parameter", () => {
    renderPage();
    const href = screen
      .getAllByText("Get started")
      .map((el) => el.closest("a")?.getAttribute("href"))
      .find((h) => h?.endsWith("/signup"));
    expect(href?.endsWith("/signup")).toBe(true);
    expect(href).not.toContain("plan=");
    expect(screen.getByText("Pricing coming soon").closest("a")).toBeNull();
    expect((screen.getByText("Pricing coming soon") as HTMLButtonElement).disabled).toBe(true);
  });

  it("uses a plain heading and an honest free card", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Pricing" })).toBeDefined();
    expect(screen.getByText("Free today")).toBeDefined();
    expect(screen.queryByText(/financial journey/i)).toBeNull();
  });

  it("shows the introductory price from the business details config", () => {
    renderPage();
    expect(screen.getByText("£4.99")).toBeDefined();
    expect(screen.getByText("per month")).toBeDefined();
    expect(screen.getByText("Introductory price, subject to change")).toBeDefined();
    fireEvent.click(screen.getByRole("switch", { name: "Annual billing" }));
    expect(screen.getByText("£49")).toBeDefined();
    expect(screen.getByText("per year, billed annually")).toBeDefined();
    expect(screen.queryByText(/£X|£Y|Placeholder price/)).toBeNull();
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
    expect(description).not.toMatch(/FCA|Open Banking/);
  });
});
