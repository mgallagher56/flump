import { BUSINESS_DETAILS, LEGAL_REVIEW_NOTE } from "@flump/business-details";
import { render, screen, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import {
  ContactEmail,
  hasPlaceholderDetails,
  LegalPage,
  LegalSection,
  PLACEHOLDER_DETAILS_NOTE,
} from "./LegalPage";

const renderPage = () =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <LegalPage description="A test page." intro="A short introduction." page="terms">
          <LegalSection id="first" title="First section">
            <p>
              Write to <ContactEmail subject="Test subject" />.
            </p>
          </LegalSection>
        </LegalPage>
      </MemoryRouter>
    </HelmetProvider>,
  );

describe("LegalPage", () => {
  it("shows the page's title and its dated version line from the shared list", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Terms of use" })).toBeDefined();
    expect(screen.getByTestId("legal-version").textContent).toBe("Version 0.1, 25 November 2026");
  });

  it("says who checked the page, and never claims a solicitor did", () => {
    renderPage();
    const note = screen.getByTestId("legal-review-note").textContent ?? "";
    expect(note).toBe(LEGAL_REVIEW_NOTE);
    expect(note).toContain("A solicitor has not reviewed this page.");
  });

  it("flags placeholder business details exactly when a printed detail is a stand-in", () => {
    renderPage();
    const flagged = screen.queryByTestId("legal-placeholder-note");
    expect(hasPlaceholderDetails()).toBe(
      BUSINESS_DETAILS.legalName.isPlaceholder ||
        BUSINESS_DETAILS.registeredOffice.isPlaceholder ||
        BUSINESS_DETAILS.supportEmail.isPlaceholder,
    );
    if (hasPlaceholderDetails()) expect(flagged?.textContent).toBe(PLACEHOLDER_DETAILS_NOTE);
    else expect(flagged).toBeNull();
  });

  it("gives each section an anchor and a heading that labels it", () => {
    renderPage();
    const region = screen.getByRole("region", { name: "First section" });
    expect(region.id).toBe("first");
    expect(within(region).getByRole("heading", { level: 2 }).id).toBe("first-heading");
  });

  it("links to the other three legal pages and the security page, not to itself", () => {
    renderPage();
    const nav = screen.getByRole("navigation", { name: "Related pages" });
    expect(
      within(nav)
        .getAllByRole("link")
        .map((a) => a.getAttribute("href")),
    ).toEqual(["/privacy", "/cookies", "/accessibility", "/security"]);
  });

  it("builds the contact link with a subject and no body", () => {
    renderPage();
    const href = within(screen.getByRole("region", { name: "First section" }))
      .getByRole("link")
      .getAttribute("href");
    expect(href).toBe(`mailto:${BUSINESS_DETAILS.supportEmail.value}?subject=Test%20subject`);
  });

  it("has one main landmark that the skip link can focus", () => {
    renderPage();
    const main = screen.getByRole("main");
    expect(main.id).toBe("main");
    expect(main.getAttribute("tabindex")).toBe("-1");
  });
});
