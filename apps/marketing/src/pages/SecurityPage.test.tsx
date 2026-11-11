import { render, screen, waitFor } from "@testing-library/react";
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
    expect(
      screen.getByRole("heading", { level: 1, name: "Security built into the architecture" }),
    ).toBeDefined();
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

  it("describes read-only access", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Read-only by design" })).toBeDefined();
    expect(screen.getByText(/no feature to make payments/i)).toBeDefined();
  });

  it("makes only supportable encryption claims", () => {
    renderPage();
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/TLS 1\.3|HSTS preload|All sensitive personal financial records/i);
    expect(screen.getByText(/Bank connection tokens are encrypted at rest/i)).toBeDefined();
  });

  it("does not mention CSV imports", () => {
    renderPage();
    expect(document.body.textContent).not.toMatch(/CSV/i);
  });

  it("describes deletion without overclaiming", () => {
    renderPage();
    expect(document.body.textContent).not.toMatch(
      /permanent erasure|one-click|purges all historical data/i,
    );
    expect(screen.getByText(/delete all your financial data from your profile/i)).toBeDefined();
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
});
