import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ToolPage } from "./ToolPage";
import { TOOLS_CATALOG } from "./ToolsIndexPage";

const renderAt = (path: string) =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/tools/:slug" element={<ToolPage />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );

describe("ToolPage", () => {
  it("renders the catalogue entry for a known slug", () => {
    const tool = TOOLS_CATALOG[0];
    renderAt(`/tools/${tool?.slug}`);
    expect(screen.getByRole("heading", { level: 1, name: tool?.title })).toBeTruthy();
    expect(screen.getByText("All UK calculators")).toBeTruthy();
  });

  it("falls back to the first catalogue entry for an unknown slug", () => {
    renderAt("/tools/not-a-real-tool");
    expect(screen.getByRole("heading", { level: 1, name: TOOLS_CATALOG[0]?.title })).toBeTruthy();
  });

  it("maps the legacy mortgage slug to the current catalogue entry", () => {
    renderAt("/tools/mortgage-overpay-vs-isa-calculator");
    const tool = TOOLS_CATALOG.find((t) => t.slug === "mortgage-overpayment-vs-isa-calculator");
    expect(screen.getByRole("heading", { level: 1, name: tool?.title })).toBeTruthy();
  });

  it.each([
    "uk-100k-tax-trap-calculator",
    "uk-debt-snowball-vs-avalanche-calculator",
    "zero-percent-balance-transfer-calculator",
    "landlord-section-24-tax-calculator",
    "overdraft-interest-calculator",
    "student-loan-plan-2-calculator",
  ])("renders a calculator for %s", (slug) => {
    renderAt(`/tools/${slug}`);
    expect(
      screen.getAllByText(/Open this calculation in your Flump workspace/).length,
    ).toBeGreaterThan(0);
  });
});
