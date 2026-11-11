import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import {
  COMPANY_ADDRESS_PLACEHOLDER,
  COMPANY_NAME_PLACEHOLDER,
  COMPANY_NUMBER_PLACEHOLDER,
} from "../utils/placeholders";
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

  it("shows company placeholders and a single read-only link to /security", () => {
    const { container } = renderFooter();
    const text = container.textContent ?? "";
    expect(text).toContain(COMPANY_NAME_PLACEHOLDER);
    expect(text).toContain(COMPANY_NUMBER_PLACEHOLDER);
    expect(text).toContain(COMPANY_ADDRESS_PLACEHOLDER);
    expect(text).not.toMatch(/Registered in England/i);
    expect(screen.getByRole("link", { name: "Read-only by design" }).getAttribute("href")).toBe(
      "/security",
    );
  });
});
