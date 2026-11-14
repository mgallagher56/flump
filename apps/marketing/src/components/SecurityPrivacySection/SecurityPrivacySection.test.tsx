import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { SecurityPrivacySection } from "./SecurityPrivacySection";

const renderStrip = () =>
  render(
    <MemoryRouter>
      <SecurityPrivacySection />
    </MemoryRouter>,
  );

describe("SecurityPrivacySection (home security strip)", () => {
  it("is a short strip on a quiet band that links to the security page", () => {
    renderStrip();
    const strip = screen.getByTestId("security-privacy-section");
    // A quiet band: the page's tints are "What you can see" (apricot) and the final CTA (sage).
    expect(strip.getAttribute("data-tone-band")).toBe("subtle");
    expect(screen.getByRole("heading", { level: 2, name: "Security and privacy" })).toBeDefined();
    expect(
      screen.getByRole("link", { name: "What Flump can and cannot do" }).getAttribute("href"),
    ).toBe("/security");
  });

  it("states today's facts and promises no bank connection", () => {
    renderStrip();
    const text = screen.getByTestId("security-privacy-section").textContent ?? "";
    expect(text).toMatch(/no bank login is needed/);
    expect(text).toMatch(/no feature to make payments or move money/);
    expect(text).not.toMatch(/coming soon|bank connection|bank feed|engine|manual-first/i);
  });
});
