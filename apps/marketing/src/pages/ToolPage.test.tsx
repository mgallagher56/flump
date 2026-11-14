import { ONBOARDING_SEED_STORAGE_KEY } from "@flump/finance-engine";
import { getToolEntry, getToolGuide, TOOL_CATALOGUE } from "@repo/ui/tools";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ToolPage } from "./ToolPage";

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
    const tool = TOOL_CATALOGUE[0];
    renderAt(`/tools/${tool?.slug}`);
    expect(screen.getByRole("heading", { level: 1, name: tool?.title })).toBeTruthy();
    expect(screen.getByRole("link", { name: "All calculators" }).getAttribute("href")).toBe(
      "/tools",
    );
  });

  it("renders the calculator for a slug in any case, matching the 200 status and canonical", () => {
    renderAt("/tools/UK-100K-Tax-Trap-Calculator");
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: getToolEntry("uk-100k-tax-trap-calculator").title,
      }),
    ).toBeTruthy();
    expect(screen.queryByText("Page not found")).toBeNull();
  });

  it.each(TOOL_CATALOGUE.map((tool) => tool.slug))(
    "shows one 'Guidance, not advice' notice on /tools/%s",
    (slug) => {
      renderAt(`/tools/${slug}`);
      expect(screen.getAllByRole("note", { name: "Guidance, not advice" })).toHaveLength(1);
    },
  );

  it("asks for a beta invite instead of linking a closed sign-up", () => {
    renderAt("/tools/uk-100k-tax-trap-calculator");
    expect(screen.getAllByText(/Request an invite/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Continue in Flump/)).toBeNull();
  });

  it("does not write the onboarding seed when the CTA requests an invite", () => {
    localStorage.removeItem(ONBOARDING_SEED_STORAGE_KEY);
    renderAt("/tools/uk-100k-tax-trap-calculator");
    const calculator = within(screen.getByTestId("tax-trap-calculator-tool"));
    fireEvent.click(calculator.getByRole("button", { name: /Request an invite/ }));
    expect(localStorage.getItem(ONBOARDING_SEED_STORAGE_KEY)).toBeNull();
  });

  it("renders the not-found page for an unknown slug", () => {
    renderAt("/tools/not-a-real-tool");
    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeTruthy();
  });

  it("maps the legacy mortgage slug to the current catalogue entry", () => {
    renderAt("/tools/mortgage-overpay-vs-isa-calculator");
    const tool = TOOL_CATALOGUE.find((t) => t.slug === "mortgage-overpayment-vs-isa-calculator");
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
    // The calculator draws the arrow as an icon, so the label itself has none.
    expect(screen.getByRole("button", { name: "Request an invite" })).toBeDefined();
  });

  it.each(TOOL_CATALOGUE.map((tool) => tool.slug))(
    "/tools/%s: breadcrumb, h1 and one line, then the tool, then the collapsed guide",
    (slug) => {
      const tool = getToolEntry(slug);
      const { container } = renderAt(`/tools/${slug}`);
      const main = container.querySelector("main") as HTMLElement;
      const calculator = within(main).getByRole("region", { name: "Calculator" });

      // Nothing but the breadcrumb, h1 and description before the calculator.
      const crumbs = within(screen.getByRole("navigation", { name: "Breadcrumb" })).getAllByRole(
        "listitem",
      );
      expect(crumbs.map((c) => c.textContent)).toEqual(["All calculators", tool.title]);
      const before = Array.from(main.querySelectorAll("nav, h1, h2, p, span, [role='note']"))
        .filter((el) => el.compareDocumentPosition(calculator) & Node.DOCUMENT_POSITION_FOLLOWING)
        .filter((el) => !calculator.contains(el));
      for (const el of before) {
        const allowed =
          el.closest("nav") !== null || el.tagName === "H1" || el.textContent === tool.description;
        expect(allowed, `unexpected ${el.tagName} "${el.textContent}" above the tool`).toBe(true);
      }

      // One notice, inside the calculator.
      const notes = main.querySelectorAll('[role="note"]');
      expect(notes).toHaveLength(1);
      expect(calculator.contains(notes[0] as Node)).toBe(true);

      // Guide and FAQ are closed native details, with their text in the markup.
      const details = Array.from(main.querySelectorAll("[data-tool-guide] details"));
      expect(details).toHaveLength(2);
      for (const d of details) expect(d.hasAttribute("open")).toBe(false);
      expect(main.textContent).toContain(getToolGuide(slug).faqs[0]?.a ?? "");
      expect(main.textContent).not.toMatch(
        /ENGINE|Mathematically|guaranteed|\bsyncs\b|\bmonitors\b|tax trap/i,
      );
    },
  );
});
