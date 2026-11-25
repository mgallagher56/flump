import { BUSINESS_DETAILS } from "@flump/business-details";
import { expectPageRules } from "@repo/ui/testing";
import { render, screen, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { PrivacyPage } from "./PrivacyPage";

const renderPage = () =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <PrivacyPage />
      </MemoryRouter>
    </HelmetProvider>,
  );

const sectionText = (name: string) => screen.getByRole("region", { name }).textContent ?? "";

describe("PrivacyPage", () => {
  it("has the sections a UK privacy notice needs, in order", () => {
    renderPage();
    const main = screen.getByRole("main");
    expect(screen.getByRole("heading", { level: 1, name: "Privacy notice" })).toBeDefined();
    expect(
      within(main)
        .getAllByRole("heading", { level: 2 })
        .map((h) => h.textContent),
    ).toEqual([
      "Who is responsible for your data",
      "What we hold and why",
      "Details about your clients",
      "Who we share data with",
      "Where your data is kept",
      "How long we keep it",
      "Your rights",
      "Complaints",
      "Other things to know",
      "Changes to this notice",
      "Related pages",
    ]);
    expectPageRules(main, { projectionNotices: 0 });
  });

  it("names the controller, its address and its mailbox from the business details", () => {
    renderPage();
    const who = sectionText("Who is responsible for your data");
    expect(who).toContain(BUSINESS_DETAILS.legalName.value);
    expect(who).toContain(BUSINESS_DETAILS.registeredOffice.value);
    expect(who).toContain(BUSINESS_DETAILS.supportEmail.value);
  });

  it("gives a lawful basis for every group of data it holds", () => {
    renderPage();
    const what = screen.getByRole("region", { name: "What we hold and why" });
    const groups = within(what)
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.textContent);
    expect(groups).toEqual([
      "Your sign-in",
      "The figures and details you enter",
      "Accounts and costs you share with someone",
      "The AI connection (preview)",
      "Security records",
      "Server logs and error reports",
      "Invites",
      "Messages you send us",
      "What we do not hold",
    ]);
    // Eight groups of data, each with its own "Lawful basis:" sentence.
    expect((what.textContent?.match(/Lawful basis:/g) ?? []).length).toBe(8);
    expect(what.textContent).toContain(
      "Flump does not ask who the other person is, and it does not link or invite them.",
    );
  });

  it("covers client details: what, whose, and that the user decides", () => {
    renderPage();
    const clients = screen.getByRole("region", { name: "Details about your clients" });
    expect(clients.textContent).toContain("email address and postal address");
    expect(clients.textContent).toContain("You decide what goes in");
    expect(clients.textContent).toContain("The AI connection cannot read invoices or work logs.");
    expect(clients.textContent).toContain(
      "Issued and paid invoices cannot be deleted one at a time.",
    );
    expect(within(clients).getByRole("link", { name: "terms of use" }).getAttribute("href")).toBe(
      "/terms#client-details",
    );
  });

  it("names each provider and its country, and says data leaves the UK", () => {
    renderPage();
    const sharing = sectionText("Who we share data with");
    for (const provider of ["Railway Corporation", "WorkOS, Inc.", "Functional Software, Inc."]) {
      expect(sharing).toContain(provider);
    }
    expect((sharing.match(/a US company/g) ?? []).length).toBe(3);
    const where = sectionText("Where your data is kept");
    expect(where).toContain("So your data leaves the UK.");
    expect(where).toContain("UK-US data bridge");
    expect(where).toContain("UK addendum to the standard contractual clauses");
  });

  it("states each retention period the code enforces", () => {
    renderPage();
    const kept = sectionText("How long we keep it");
    expect(kept).toContain("for 24 months. It holds a one-way code");
    expect(kept).toContain("the record of sensitive actions: 13 months");
    expect(kept).toContain("Your record of permissions: until you delete your account.");
    expect(kept).toContain("removed 30 days after its last change");
    expect(kept).toContain("undo an update to Flump: up to 90 days");
    expect(kept).toContain("do not use Flump for 24 months");
    expect(kept).toContain(
      "Invite records: for as long as you are in the test phase, then 30 days.",
    );
    expect(kept).toContain("Backups: any backup of the database is kept for a limited period.");
    expect(kept).not.toContain("35 days");
  });

  it("sets the right to object apart and says how to use every right", () => {
    renderPage();
    const rights = screen.getByRole("region", { name: "Your rights" });
    const objection = Array.from(rights.querySelectorAll("p > strong")).map((s) => s.textContent);
    expect(objection).toHaveLength(1);
    expect(objection[0]).toMatch(
      /^You can object to any use that rests on our legitimate interest/,
    );
    expect(rights.textContent).toContain('"Data and export", then "Download your data"');
    expect(rights.textContent).toContain("We answer within one month.");
  });

  it("offers a complaint to Flump, acknowledged within 30 days, and to the ICO", () => {
    renderPage();
    const complaints = screen.getByRole("region", { name: "Complaints" });
    expect(complaints.textContent).toContain("within 30 days");
    expect(
      within(complaints)
        .getByRole("link", { name: "ico.org.uk/make-a-complaint" })
        .getAttribute("href"),
    ).toBe("https://ico.org.uk/make-a-complaint/");
  });

  it("puts no body and no financial data in any mailto link", () => {
    renderPage();
    const mailtos = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href") ?? "")
      .filter((href) => href.startsWith("mailto:"));
    expect(mailtos.length).toBeGreaterThanOrEqual(3);
    for (const href of mailtos) expect(href).not.toMatch(/[?&]body=/i);
  });
});
