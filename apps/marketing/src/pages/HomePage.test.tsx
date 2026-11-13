import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { HomePage } from "./HomePage";

describe("Marketing HomePage (E31 majority order)", () => {
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
    expect(
      screen.getByRole("heading", { level: 1, name: "See where you stand each month." }),
    ).toBeDefined();
    expect(screen.getAllByText(/Request an invite →/i)[0]).toBeDefined();

    // Verify clean baseline preview card is present
    expect(screen.getByTestId("baseline-snapshot-preview")).toBeDefined();
    expect(screen.getByText("Example monthly picture")).toBeDefined();
    expect(screen.getByText("£68,400")).toBeDefined();
    expect(screen.getByText("+£840")).toBeDefined();
    expect(screen.getAllByText("£195").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/6\.4/).length).toBeGreaterThan(0);

    const livePreviewLink = screen.getByRole("link", { name: /See live preview in app/i });
    expect(livePreviewLink).toBeDefined();
    expect(livePreviewLink.getAttribute("href")).toContain("/sandbox");
  });

  it("orders the sections: monthly picture, big moves, pay rise, security, MCP, FAQ", () => {
    const { container } = renderHome();
    const ids = ["monthly-picture", "big-moves", "pay-rise", "faq"];
    const positions = ids.map((id) => {
      const el = container.querySelector(`#${id}`);
      expect(el, id).not.toBeNull();
      return Array.from(container.querySelectorAll("*")).indexOf(el as Element);
    });
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    const security = screen.getByTestId("security-privacy-section");
    const all = Array.from(container.querySelectorAll("*"));
    expect(all.indexOf(security)).toBeGreaterThan(positions[2]);
    expect(all.indexOf(security)).toBeLessThan(positions[3]);
    expect(screen.getByText("Browse free calculators", { selector: "a" })).toBeDefined();
  });

  it("keeps the £100k tax trap out of the home page body by default (the footer still links it)", () => {
    const { container } = renderHome();
    expect(container.querySelector("main")?.textContent ?? "").not.toMatch(/tax trap|60%|£100k/i);
    expect(screen.getByRole("link", { name: "£100k tax trap calculator" })).toBeDefined();
  });

  it("does not claim FCA Open Banking sync in the comparison matrix or elsewhere", () => {
    const { container } = renderHome();
    expect(screen.queryByText(/FCA Open Banking read-only sync/i)).toBeNull();
    expect(container.textContent ?? "").not.toMatch(/AISP|PISP|FCA-regulated/);
  });
});
