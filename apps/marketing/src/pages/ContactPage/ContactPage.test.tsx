import { BUSINESS_DETAILS } from "@flump/business-details";
import { render, screen, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ContactPage } from "./ContactPage";

const renderPage = () =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <ContactPage />
      </MemoryRouter>
    </HelmetProvider>,
  );

describe("ContactPage", () => {
  it("renders the page heading and every section", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Contact Flump" })).toBeDefined();
    for (const name of [
      "Support",
      "Feedback",
      "Request a beta invite",
      "Security",
      "Privacy and your data",
      "Complaints",
    ]) {
      expect(screen.getByRole("heading", { level: 2, name })).toBeDefined();
    }
  });

  it("links the support mailbox, feedback, invite request and complaints by mailto", () => {
    renderPage();
    const main = screen.getByRole("main");
    const hrefs = within(main)
      .getAllByRole("link")
      .map((a) => a.getAttribute("href") ?? "")
      .filter((h) => h.startsWith("mailto:"));
    const address = BUSINESS_DETAILS.supportEmail.value;
    expect(hrefs.length).toBeGreaterThanOrEqual(4);
    for (const href of hrefs) expect(href.startsWith(`mailto:${address}`)).toBe(true);
    expect(hrefs.some((h) => h.includes("subject=Flump%20beta%20invite%20request"))).toBe(true);
  });

  it("has the #beta anchor that the sign-up CTAs point at", () => {
    const { container } = renderPage();
    const beta = container.querySelector("#beta");
    expect(beta).not.toBeNull();
    expect(beta?.textContent).toMatch(/invite-only/);
  });

  it("puts no financial data in any mailto body and no body at all", () => {
    renderPage();
    for (const a of screen.getAllByRole("link")) {
      const href = a.getAttribute("href") ?? "";
      if (href.startsWith("mailto:")) expect(href).not.toMatch(/[?&]body=/i);
    }
  });

  it("links to the security page", () => {
    renderPage();
    const main = screen.getByRole("main");
    expect(
      within(main).getByRole("link", { name: "Security and privacy" }).getAttribute("href"),
    ).toBe("/security");
  });

  it("makes no response-time promise", () => {
    const { container } = renderPage();
    expect(container.textContent).not.toMatch(
      /business day|within \d+ (hours?|days?)|24 hours|reply (quickly|promptly)|respond (quickly|promptly)/i,
    );
  });
});
