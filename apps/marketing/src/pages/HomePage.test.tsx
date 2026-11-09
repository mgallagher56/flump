import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { HomePage } from "./HomePage";

describe("Marketing HomePage (Simplified 6-Section Narrative)", () => {
  const renderHome = () =>
    render(
      <HelmetProvider>
        <BrowserRouter>
          <HomePage />
        </BrowserRouter>
      </HelmetProvider>,
    );

  it("renders the benefit-focused hero without embedded calculator sliders", () => {
    renderHome();
    expect(screen.getByText(/Get out of the red/i)).toBeDefined();
    expect(screen.getByText(/Build into the black/i)).toBeDefined();
    expect(screen.getByText(/Get Your 60-Second Baseline Free →/i)).toBeDefined();

    // Verify clean baseline preview card is present
    expect(screen.getByTestId("baseline-snapshot-preview")).toBeDefined();
    expect(screen.getByText("Your 60-Second UK Financial Baseline")).toBeDefined();
    expect(screen.getByText("£68,400")).toBeDefined();
    expect(screen.getByText("+£840")).toBeDefined();
    expect(screen.getAllByText("£195").length).toBeGreaterThan(0);
    expect(screen.getByText("6.4")).toBeDefined();
  });

  it("renders the 3-step How It Works section", () => {
    renderHome();
    expect(screen.getByTestId("how-it-works-section")).toBeDefined();
    expect(screen.getByText("How Flump Works in 3 Simple Steps")).toBeDefined();
    expect(screen.getByText("Enter 6 Rough Numbers")).toBeDefined();
    expect(screen.getByText("Unlock Instant UK Insights")).toBeDefined();
    expect(screen.getByText("Drill Down When You Want")).toBeDefined();
  });

  it("renders core outcome pillars, comparison matrix, security, and FAQ sections", () => {
    renderHome();
    expect(screen.getByText("Four Pillars of Your Financial Plan")).toBeDefined();
    expect(screen.getByText("Built for UK Rules, Not Generic Spreadsheets")).toBeDefined();
    expect(screen.getByTestId("security-privacy-section")).toBeDefined();
    expect(screen.getByText("Frequently Asked Questions")).toBeDefined();
    expect(screen.getByText("Browse Free Calculators Directory")).toBeDefined();
  });
});
