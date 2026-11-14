import { BUSINESS_DETAILS } from "@flump/business-details";
import { expectPageRules } from "@repo/ui/testing";
import { render, screen, waitFor, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AI_STAGING_SENTENCE } from "../../utils/aiConnection";
import { SecurityPage } from "./SecurityPage";

const renderPage = () =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <SecurityPage />
      </MemoryRouter>
    </HelmetProvider>,
  );

const sentences = (text: string) =>
  text
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

describe("SecurityPage (E16 PR 12)", () => {
  it("has an intro and one list of facts, and no cards repeating the intro", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Security and privacy" })).toBeDefined();
    const main = screen.getByRole("main");
    expect(within(main).getAllByRole("list", { name: "Security facts" })).toHaveLength(1);
    expect(
      within(main)
        .getAllByRole("heading", { level: 2 })
        .map((h) => h.textContent),
    ).toEqual(["Reporting a security issue"]);
    expect(within(main).queryAllByRole("heading", { level: 3 })).toHaveLength(0);
    expectPageRules(main, { projectionNotices: 0 });
  });

  it("says no sentence twice", () => {
    renderPage();
    const all = sentences(screen.getByRole("main").textContent ?? "");
    expect(new Set(all).size).toBe(all.length);
    expect(screen.getAllByText(/no feature to make payments/i)).toHaveLength(1);
  });

  it("promises no bank connection or feed, and uses the shared staging sentence", () => {
    renderPage();
    const text = screen.getByRole("main").textContent ?? "";
    expect(text).not.toMatch(/coming soon|bank feed|bank connection/i);
    expect(text).toContain(AI_STAGING_SENTENCE);
  });

  it("has an honest title and no FCA claims", async () => {
    renderPage();
    await waitFor(() => expect(document.title).toBe("Security and privacy | Flump"));
    expect(screen.getByRole("main").textContent).not.toMatch(
      /AISP|FCA|authorised to perform|permissions ledger/i,
    );
  });

  it("makes no encryption, erasure, data-selling or response-time claims", () => {
    renderPage();
    expect(document.body.textContent).not.toMatch(
      /encrypt|AES|TLS|HSTS|CSV|delete all your|close your account|never sell|visible only|business day/i,
    );
  });

  it("does not offer an enquiry form that cannot send", () => {
    renderPage();
    expect(screen.queryByRole("button", { name: /Contact security and support/i })).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows the security contact as one line with the address as a link", () => {
    renderPage();
    const { value, isPlaceholder } = BUSINESS_DETAILS.securityContact;
    const link = screen.getByRole("link", { name: value });
    expect(link.getAttribute("href")).toBe(`mailto:${value}`);
    expect(link.closest("p")?.textContent?.startsWith("Email ")).toBe(true);
    expect(/not monitored yet/i.test(document.body.textContent ?? "")).toBe(isPlaceholder);
  });
});
