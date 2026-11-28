import { BUSINESS_DETAILS } from "@flump/business-details";
import { expectPageRules } from "@repo/ui/testing";
import { render, screen, waitFor, within } from "@testing-library/react";
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

  it("asks no one to request an invite, says access is by invite link, and keeps pricing off the page", () => {
    renderPage();
    const main = screen.getByRole("main");
    // Invite links are shared by hand (owner, 28 Nov 2026): nothing on the page asks for one.
    expect(within(main).queryByRole("link", { name: /request an invite/i })).toBeNull();
    expect(main.textContent).not.toMatch(/for an invite|ask for|ask here|beta invite/i);
    expect(main.textContent).toMatch(/Access is by invite link during testing\./);
    expect(main.textContent).not.toMatch(/free|Nothing is charged/i);
  });

  it("describes the page without an invite request", async () => {
    renderPage();
    await waitFor(() => expect(document.title).toContain("Contact"));
    expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(
      "Email Flump with a question or feedback, or to raise a complaint.",
    );
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

  it("has no #beta section: nothing links to an invite request any more", () => {
    const { container } = renderPage();
    expect(container.querySelector("#beta")).toBeNull();
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
