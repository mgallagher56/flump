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
    expect(screen.getByText(/Your complete UK financial picture in 60 seconds/i)).toBeDefined();
    expect(screen.getByText(/Get your free baseline →/i)).toBeDefined();

    // Verify clean baseline preview card is present
    expect(screen.getByTestId("baseline-snapshot-preview")).toBeDefined();
    expect(screen.getByText("Your 60-second UK financial baseline")).toBeDefined();
    expect(screen.getByText("£68,400")).toBeDefined();
    expect(screen.getByText("+£840")).toBeDefined();
    expect(screen.getAllByText("£195").length).toBeGreaterThan(0);
    expect(screen.getByText("6.4")).toBeDefined();

    const livePreviewLink = screen.getByRole("link", { name: /See live preview in app/i });
    expect(livePreviewLink).toBeDefined();
    expect(livePreviewLink.getAttribute("href")).toContain("/sandbox");
  });

  it("renders the 3-step How It Works section", () => {
    renderHome();
    expect(screen.getByTestId("how-it-works-section")).toBeDefined();
    expect(screen.getByText("How Flump works in 3 simple steps")).toBeDefined();
    expect(screen.getByText("Enter 6 rough numbers")).toBeDefined();
    expect(screen.getByText("See your numbers immediately")).toBeDefined();
    expect(screen.getByText("Drill down when you need to")).toBeDefined();
  });

  it("renders core outcome pillars, comparison matrix, security, and FAQ sections", () => {
    renderHome();
    expect(screen.getByText("Four pillars of your financial plan")).toBeDefined();
    expect(screen.getByText("Built for UK rules, not spreadsheets")).toBeDefined();
    expect(screen.getByTestId("security-privacy-section")).toBeDefined();
    expect(screen.getAllByText("Frequently asked questions").length).toBeGreaterThan(0);
    expect(screen.getByText("Browse free calculators")).toBeDefined();
  });

  it("does not claim FCA Open Banking sync in the comparison matrix or elsewhere", () => {
    const { container } = renderHome();
    expect(screen.queryByText(/FCA Open Banking read-only sync/i)).toBeNull();
    expect(container.textContent ?? "").not.toMatch(/AISP|PISP|FCA-regulated/);
  });
});
