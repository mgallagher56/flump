import { BUSINESS_DETAILS } from "@flump/business-details";
import { expectPageRules } from "@repo/ui/testing";
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
  it("renders the page heading, one email card and the security route as a line", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Contact Flump" })).toBeDefined();
    const main = screen.getByRole("main");
    expect(
      within(main)
        .getAllByRole("heading", { level: 2 })
        .map((h) => h.textContent),
    ).toEqual(["Email"]);
    expect(within(main).getAllByRole("region")).toHaveLength(1);
    expectPageRules(main, { projectionNotices: 0 });
  });

  it("leaves the invite button to the header and keeps pricing off the page", () => {
    renderPage();
    const main = screen.getByRole("main");
    // The header carries the invite button; the page body has none (round 4).
    expect(within(main).queryByRole("link", { name: "Request an invite" })).toBeNull();
    expect(within(main).queryByText(/Email for an invite/)).toBeNull();
    expect(main.textContent).not.toMatch(/free|Nothing is charged/i);
  });

  it("folds the placeholder notice into the email line and says it once", () => {
    renderPage();
    const text = screen.getByRole("main").textContent ?? "";
    const count = (text.match(/placeholder/g) ?? []).length;
    expect(count).toBe(BUSINESS_DETAILS.supportEmail.isPlaceholder ? 1 : 0);
    expect(text).toMatch(/Privacy requests and complaints come here too/);
  });

  it("has one mailto link in the general card", () => {
    renderPage();
    const main = screen.getByRole("main");
    const hrefs = within(main)
      .getAllByRole("link")
      .map((a) => a.getAttribute("href") ?? "")
      .filter((h) => h.startsWith("mailto:"));
    const address = BUSINESS_DETAILS.supportEmail.value;
    expect(hrefs).toHaveLength(1);
    for (const href of hrefs) expect(href.startsWith(`mailto:${address}`)).toBe(true);
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
