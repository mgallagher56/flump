import { BUSINESS_DETAILS } from "@flump/business-details";
import { expectPageRules } from "@repo/ui/testing";
import { render, screen, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AccessibilityPage } from "./AccessibilityPage";

const renderPage = () =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <AccessibilityPage />
      </MemoryRouter>
    </HelmetProvider>,
  );

const sectionText = (name: string) => screen.getByRole("region", { name }).textContent ?? "";

describe("AccessibilityPage", () => {
  it("has the statement's sections, in order", () => {
    renderPage();
    const main = screen.getByRole("main");
    expect(
      screen.getByRole("heading", { level: 1, name: "Accessibility statement" }),
    ).toBeDefined();
    expect(
      within(main)
        .getAllByRole("heading", { level: 2 })
        .map((h) => h.textContent),
    ).toEqual([
      "What we aim for",
      "What we test",
      "What we have not tested",
      "Tell us about a problem",
      "About this statement",
      "Related pages",
    ]);
    expectPageRules(main, { projectionNotices: 0 });
  });

  it("names the target and claims no conformance", () => {
    renderPage();
    const aim = sectionText("What we aim for");
    expect(aim).toContain("Web Content Accessibility Guidelines (WCAG) 2.2 at level AA");
    expect(aim).toContain("Flump has not had an independent accessibility audit.");
    expect(screen.getByRole("main").textContent).not.toMatch(
      /fully (compliant|conformant|accessible)|is (compliant|conformant) with/i,
    );
  });

  it("lists what has not been tested, including screen readers and disabled people", () => {
    renderPage();
    const untested = screen.getByRole("region", { name: "What we have not tested" });
    const points = within(untested)
      .getAllByRole("listitem")
      .map((li) => li.textContent);
    expect(points).toHaveLength(6);
    expect(points[0]).toMatch(/^tested Flump with screen readers/);
    expect(points[2]).toBe("tested Flump with disabled people");
  });

  it("says the page checks warn and do not block", () => {
    renderPage();
    expect(sectionText("What we test")).toContain(
      "our list of known failures from the page checks is empty",
    );
    expect(sectionText("What we test")).toContain(
      "The page checks warn us about a new failure but do not stop a change.",
    );
  });

  it("gives one way to report a problem and names the duty to adjust", () => {
    renderPage();
    const report = screen.getByRole("region", { name: "Tell us about a problem" });
    const mail = within(report).getByRole("link", { name: BUSINESS_DETAILS.supportEmail.value });
    expect(mail.getAttribute("href")).toBe(
      `mailto:${BUSINESS_DETAILS.supportEmail.value}?subject=Accessibility`,
    );
    expect(report.textContent).toContain("Equality Act 2010");
    expect(report.textContent).not.toMatch(/within \d+|working days?|business days?/i);
  });
});
