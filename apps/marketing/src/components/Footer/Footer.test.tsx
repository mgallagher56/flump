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
  it("is the dark contrast band with text.onContrast text (Midnight and Mint)", () => {
    const { container } = renderFooter();
    const footer = container.querySelector("footer") as HTMLElement;
    expect(footer.className).toContain("bg-c_surface.contrast");
    expect(footer.className).toMatch(/c_text\.onContrast/);
  });

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

  it("links to the contact page, and to no invite request", () => {
    renderFooter();
    expect(screen.getByRole("link", { name: "Contact" }).getAttribute("href")).toBe("/contact");
    expect(screen.queryByText(/request an invite/i)).toBeNull();
    expect(document.querySelector('a[href*="#beta"]')).toBeNull();
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

  it("lists the five areas, the AI connection and All features under Product (E42 S4; the approved features prototype)", () => {
    renderFooter();
    const product = screen.getByRole("navigation", { name: "Product" });
    const hrefs = Array.from(product.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs.slice(0, 7)).toEqual([
      "/features/accounts",
      "/features/budget",
      "/features/pay",
      "/features/savings-and-pension",
      "/features/debt-and-borrowing",
      "/features/ai-connection",
      "/features",
    ]);
    expect(product.querySelector('a[href="/features"]')?.textContent).toBe("All features");
    expect(document.querySelector('a[href^="/mcp"]')).toBeNull();
  });

  it("puts Security and privacy, Contact and Sign in under Company", () => {
    renderFooter();
    const company = screen.getByRole("navigation", { name: "Company" });
    expect(Array.from(company.querySelectorAll("a")).map((a) => a.textContent)).toEqual([
      "Security and privacy",
      "Contact",
      expect.stringMatching(/^Sign in/),
    ]);
  });

  it("links the four legal pages under Legal, in the order of the shared list", () => {
    renderFooter();
    const legal = screen.getByRole("navigation", { name: "Legal" });
    expect(
      Array.from(legal.querySelectorAll("a")).map((a) => [a.textContent, a.getAttribute("href")]),
    ).toEqual([
      ["Privacy", "/privacy"],
      ["Terms", "/terms"],
      ["Cookies and storage", "/cookies"],
      ["Accessibility", "/accessibility"],
    ]);
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
