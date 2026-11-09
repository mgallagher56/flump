import { fireEvent, render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { PricingPage } from "./PricingPage";

describe("PricingPage", () => {
  it("renders both tiers and passes proper query parameters to signup links", () => {
    render(
      <HelmetProvider>
        <MemoryRouter>
          <PricingPage />
        </MemoryRouter>
      </HelmetProvider>,
    );

    expect(screen.getByText("Free manual tier")).toBeDefined();
    expect(screen.getByText("Pro Open Banking and tax tools")).toBeDefined();

    const freeLink = screen.getByText("Get started free").closest("a");
    expect(freeLink?.getAttribute("href")).toContain("/signUp?plan=free");

    const proLink = screen.getByText("Start 14-day free Pro trial →").closest("a");
    expect(proLink?.getAttribute("href")).toContain("/signUp?plan=pro");
  });

  it("toggles between monthly and annual pricing", () => {
    render(
      <HelmetProvider>
        <MemoryRouter>
          <PricingPage />
        </MemoryRouter>
      </HelmetProvider>,
    );

    // Initial annual pricing
    expect(screen.getByText("£7.99")).toBeDefined();

    // Toggle button
    const toggleBtn = screen.getByLabelText("Toggle annual billing");
    fireEvent.click(toggleBtn);

    // Monthly pricing
    expect(screen.getByText("£9.99")).toBeDefined();
  });
});
