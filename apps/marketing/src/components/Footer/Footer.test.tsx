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

  it("uses the shared footer headings (brand h2, columns h3) with no skipped levels", () => {
    renderFooter();
    expect(screen.getByRole("heading", { level: 2, name: "Flump" })).toBeDefined();
    expect(screen.getByRole("heading", { level: 3, name: "Product" })).toBeDefined();
    expect(screen.queryAllByRole("heading", { level: 4 })).toHaveLength(0);
  });

  it("links to the contact page and the shared sign-up CTA", () => {
    renderFooter();
    expect(screen.getByRole("link", { name: "Contact" }).getAttribute("href")).toBe("/contact");
    expect(screen.getByRole("link", { name: "Request an invite" }).getAttribute("href")).toBe(
      "/contact#beta",
    );
  });

  it("links to no calculator page: the marketing site has none (D9)", () => {
    renderFooter();
    expect(document.querySelector('a[href^="/tools"]')).toBeNull();
    expect(screen.queryByRole("link", { name: /calculators/i })).toBeNull();
  });

  it("states the tagline as the brand line under the name", () => {
    const { container } = renderFooter();
    expect(container.querySelector("footer")?.textContent).toContain("Finance without the fog.");
  });

  it("names its product column 'Product', not the brand again", () => {
    renderFooter();
    expect(screen.getByRole("heading", { name: "Product" })).toBeDefined();
  });

  it("links to the interactive preview once and never to /sandbox, which now goes to sign-up", () => {
    const { container } = renderFooter();
    const previews = screen.getAllByRole("link", { name: "Interactive preview" });
    expect(previews).toHaveLength(1);
    expect(previews[0]?.getAttribute("href")).toBe("/preview");
    expect(container.querySelector('a[href*="/sandbox"]')).toBeNull();
    expect(screen.queryByRole("link", { name: /sample data/i })).toBeNull();
  });

  it("lists Flump features, the five areas and the AI connection under Product (E42 S4)", () => {
    renderFooter();
    const product = screen.getByRole("navigation", { name: "Product" });
    const hrefs = Array.from(product.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs.slice(0, 7)).toEqual([
      "/features",
      "/features/accounts",
      "/features/budget",
      "/features/pay",
      "/features/savings-and-pension",
      "/features/debt-and-borrowing",
      "/features/ai-connection",
    ]);
    expect(document.querySelector('a[href^="/mcp"]')).toBeNull();
  });

  it("puts Security and privacy, Contact, the invite and Sign in under Company", () => {
    renderFooter();
    const company = screen.getByRole("navigation", { name: "Company" });
    expect(Array.from(company.querySelectorAll("a")).map((a) => a.textContent)).toEqual([
      "Security and privacy",
      "Contact",
      "Request an invite",
      expect.stringMatching(/^Sign in/),
    ]);
    expect(screen.queryByRole("heading", { name: "Legal" })).toBeNull();
  });

  it("shows placeholder business details as quiet text, with no warning colour or outline", () => {
    const { container } = renderFooter();
    expect(container.innerHTML).not.toMatch(/status-warning|status-danger|dashed/);
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
