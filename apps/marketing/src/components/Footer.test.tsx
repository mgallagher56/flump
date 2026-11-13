import { BUSINESS_DETAILS } from "@flump/business-details";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Footer } from "./Footer";

const renderFooter = () =>
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );

describe("Footer", () => {
  it("contains no unverified security or regulatory claims", () => {
    const { container } = renderFooter();
    expect(container.textContent ?? "").not.toMatch(
      /256-bit AES|FCA AISP|regulated Open Banking|UK GDPR data policies/i,
    );
  });

  it("makes no regulatory, HMRC or advice claims", () => {
    const { container } = renderFooter();
    expect(container.textContent ?? "").not.toMatch(
      /Financial Conduct|authorised|HMRC|current tax years|Important information/i,
    );
  });

  it("uses h2 section headings with no skipped levels", () => {
    renderFooter();
    expect(screen.getByRole("heading", { level: 2, name: "Calculators" })).toBeDefined();
    expect(screen.queryAllByRole("heading", { level: 4 })).toHaveLength(0);
  });

  it("links to the contact page and the shared sign-up CTA", () => {
    renderFooter();
    expect(screen.getByRole("link", { name: "Contact" }).getAttribute("href")).toBe("/contact");
    expect(screen.getByRole("link", { name: "Request an invite" }).getAttribute("href")).toBe(
      "/contact#beta",
    );
  });

  it("links to the security page", () => {
    renderFooter();
    expect(screen.getByRole("link", { name: "Security and privacy" }).getAttribute("href")).toBe(
      "/security",
    );
  });

  it("shows the company line and support email from the business details config", () => {
    const text = renderFooter().container.textContent ?? "";
    expect(text).toContain(BUSINESS_DETAILS.legalName.value);
    expect(text).toContain(`Company number ${BUSINESS_DETAILS.companyNumber.value}`);
    expect(text).toContain(BUSINESS_DETAILS.registeredOffice.value);
    expect(text).not.toMatch(/Registered in England/i);
    const mail = screen.getByRole("link", { name: BUSINESS_DETAILS.supportEmail.value });
    expect(mail.getAttribute("href")).toBe(`mailto:${BUSINESS_DETAILS.supportEmail.value}`);
  });
});
