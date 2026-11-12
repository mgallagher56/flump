import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
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

  it("hides the placeholder company line by default", () => {
    const { container } = renderFooter();
    expect(container.textContent ?? "").not.toMatch(/PLACEHOLDER/);
    expect(screen.getByRole("link", { name: "Security and privacy" }).getAttribute("href")).toBe(
      "/security",
    );
  });

  it("shows the placeholder company line only when VITE_SHOW_PLACEHOLDERS=true", () => {
    vi.stubEnv("VITE_SHOW_PLACEHOLDERS", "true");
    try {
      const text = renderFooter().container.textContent ?? "";
      expect(text).toContain(COMPANY_NAME_PLACEHOLDER);
      expect(text).toContain(COMPANY_NUMBER_PLACEHOLDER);
      expect(text).toContain(COMPANY_ADDRESS_PLACEHOLDER);
      expect(text).not.toMatch(/Registered in England/i);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
