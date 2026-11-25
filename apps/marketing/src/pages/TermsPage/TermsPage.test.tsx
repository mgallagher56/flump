import { BUSINESS_DETAILS } from "@flump/business-details";
import { PROJECTION_NOTICE } from "@flump/finance-engine";
import { expectPageRules } from "@repo/ui/testing";
import { render, screen, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { TermsPage } from "./TermsPage";

const renderPage = () =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <TermsPage />
      </MemoryRouter>
    </HelmetProvider>,
  );

const sectionText = (name: string) => screen.getByRole("region", { name }).textContent ?? "";

describe("TermsPage", () => {
  it("has every section of the terms, in order", () => {
    renderPage();
    const main = screen.getByRole("main");
    expect(screen.getByRole("heading", { level: 1, name: "Terms of use" })).toBeDefined();
    expect(
      within(main)
        .getAllByRole("heading", { level: 2 })
        .map((h) => h.textContent),
    ).toEqual([
      "About these terms",
      "Flump is in a test phase",
      "Guidance, not advice",
      "Your account",
      "Using Flump fairly",
      "Your figures stay yours",
      "The AI connection (preview)",
      "Client details you add for invoicing",
      "What we are responsible for",
      "Ending your account",
      "Changes to these terms",
      "Complaints and disputes",
      "Related pages",
    ]);
    expectPageRules(main, { projectionNotices: 0 });
  });

  it("names who runs Flump from the business details", () => {
    renderPage();
    const about = sectionText("About these terms");
    expect(about).toContain(BUSINESS_DETAILS.legalName.value);
    expect(about).toContain(BUSINESS_DETAILS.registeredOffice.value);
    expect(about).toContain("aged 18 or over who live in the UK");
  });

  it("carries the canonical guidance notice word for word", () => {
    renderPage();
    const guidance = screen.getByRole("region", { name: "Guidance, not advice" });
    expect(guidance.querySelector("strong")?.textContent).toBe(PROJECTION_NOTICE);
  });

  it("says the test phase takes no payment", () => {
    renderPage();
    expect(sectionText("Flump is in a test phase")).toContain(
      "We do not charge for Flump during the test phase, and we take no payment details.",
    );
  });

  it("keeps the responsibility that the law does not let a trader limit", () => {
    renderPage();
    const responsibility = screen.getByRole("region", { name: "What we are responsible for" });
    expect(responsibility.textContent).toContain(
      "We will provide Flump with reasonable care and skill.",
    );
    expect(responsibility.querySelector("p > strong")?.textContent).toBe(
      "Nothing in these terms limits what we are responsible for if our negligence causes death or personal injury. The same goes for fraud, and for anything else the law does not let us limit. Nothing in these terms affects your legal rights as a consumer.",
    );
    expect(responsibility.textContent).toContain(
      "we will repair the damage or pay you compensation",
    );
  });

  it("sets out the processor terms for client details at the anchor the privacy notice links", () => {
    const { container } = renderPage();
    const clients = container.querySelector("#client-details");
    expect(clients?.textContent).toContain('you are the "controller" and we are your "processor"');
    expect(clients?.querySelectorAll("li")).toHaveLength(12);
    expect(clients?.textContent).toContain("stay responsible to you for what those providers do");
    expect(clients?.textContent).toContain(
      "tell you if we think an instruction breaks data protection law",
    );
  });

  it("gives notice periods for ending an account and changing the terms", () => {
    renderPage();
    expect(sectionText("Ending your account")).toContain("at least 30 days before");
    expect(sectionText("Changes to these terms")).toContain("at least 14 days before it applies");
  });

  it("leaves a consumer free to use the courts where they live", () => {
    renderPage();
    expect(sectionText("Complaints and disputes")).toContain(
      "England and Wales, Scotland or Northern Ireland",
    );
  });
});
