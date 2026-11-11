import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
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
    const href = screen.getByText("Get started free").closest("a")?.getAttribute("href");
    expect(href?.endsWith("/signUp")).toBe(true);
    expect(href).not.toContain("plan=");
    expect(screen.getByText("Pricing coming soon").closest("a")).toBeNull();
    expect((screen.getByText("Pricing coming soon") as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows only an obvious placeholder price", () => {
    renderPage();
    expect(screen.getByText("£X")).toBeDefined();
    expect(screen.getByText("Placeholder price: not final")).toBeDefined();
    fireEvent.click(screen.getByRole("switch", { name: "Annual billing" }));
    expect(screen.getByText("£Y")).toBeDefined();
    expect(screen.queryByText(/£7\.99|£9\.99|£95\.88|14-day|Save 20%/)).toBeNull();
  });

  it("claims only shipped features", () => {
    const { container } = renderPage();
    expect(container.textContent).not.toMatch(/CSV|auto-categorisation|FCA|real-time/i);
    expect(screen.getByText("Section 24 landlord tax calculations")).toBeDefined();
    expect(screen.getByText("Bank connection (coming soon)")).toBeDefined();
  });

  it("has no FCA or Open Banking claim in title or meta", async () => {
    renderPage();
    await waitFor(() => expect(document.title).toContain("Pricing"));
    const description = document.querySelector('meta[name="description"]')?.getAttribute("content");
    expect(document.title).not.toMatch(/FCA|Open Banking|Pro/);
    expect(description).not.toMatch(/FCA|Open Banking/);
  });
});
