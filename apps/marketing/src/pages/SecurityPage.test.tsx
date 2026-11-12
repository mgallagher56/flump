import { render, screen, waitFor, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { SecurityPage } from "./SecurityPage";

const renderPage = () =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <SecurityPage />
      </MemoryRouter>
    </HelmetProvider>,
  );

describe("SecurityPage", () => {
  it("renders the page heading", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Security and privacy" })).toBeDefined();
  });

  it("does not offer an enquiry form that cannot send", () => {
    renderPage();
    expect(screen.queryByRole("button", { name: /Contact security and support/i })).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText(/Enquiry sent/i)).toBeNull();
  });

  it("has an honest title and no FCA claims", async () => {
    renderPage();
    await waitFor(() => expect(document.title).toBe("Security and privacy | Flump"));
    expect(document.title).not.toMatch(/FCA/i);
    expect(screen.getByRole("main").textContent).not.toMatch(
      /AISP|FCA|authorised to perform|permissions ledger/i,
    );
  });

  it("describes the no-payments design", () => {
    renderPage();
    expect(screen.getAllByText(/no feature to make payments/i).length).toBeGreaterThan(0);
  });

  it("makes no encryption, erasure or data-selling claims", () => {
    renderPage();
    expect(document.body.textContent).not.toMatch(
      /encrypt|AES|TLS|HSTS|CSV|delete all your|close your account|never sell|visible only/i,
    );
  });

  it("states bank connection is coming soon with sequential headings", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { level: 2, name: "Bank connection: coming soon" }),
    ).toBeDefined();
    expect(screen.getByRole("heading", { level: 2, name: "No payments, by design" })).toBeDefined();
    expect(within(screen.getByRole("main")).queryAllByRole("heading", { level: 3 })).toHaveLength(
      0,
    );
  });

  it("does not present a dead security address as real", () => {
    renderPage();
    expect(screen.queryByRole("link", { name: "Email security" })).toBeNull();
    expect(document.body.textContent).not.toMatch(/example\.invalid|Placeholder address/i);
    const hrefs = screen.queryAllByRole("link").map((l) => l.getAttribute("href") ?? "");
    expect(hrefs.some((h) => h.startsWith("mailto:"))).toBe(false);
  });

  it("makes no response-time promise", () => {
    renderPage();
    expect(screen.queryByText(/1 business day/i)).toBeNull();
  });

  it("includes a disclosure policy saying a contact is not yet available", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { level: 2, name: "Reporting a security issue" }),
    ).toBeDefined();
    expect(screen.getByText(/security contact is not available yet/i)).toBeDefined();
  });
});
