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

  it("labels the security email as a placeholder", () => {
    renderPage();
    expect(screen.getByText(/Placeholder address: not final/)).toBeDefined();
  });

  it("links to email security", () => {
    renderPage();
    const link = screen.getByRole("link", { name: "Email security" });
    expect(link.getAttribute("href")?.startsWith("mailto:")).toBe(true);
  });

  it("makes no response-time promise", () => {
    renderPage();
    expect(screen.queryByText(/1 business day/i)).toBeNull();
  });

  it("includes a disclosure policy that links to security.txt", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { level: 2, name: "Reporting a security issue" }),
    ).toBeDefined();
    expect(screen.getByRole("link", { name: "security.txt" })).toBeDefined();
  });
});
