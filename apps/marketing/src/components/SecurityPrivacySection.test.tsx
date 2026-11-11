import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SecurityPrivacySection } from "./SecurityPrivacySection";

describe("SecurityPrivacySection", () => {
  it("renders the honest data flow with a coming soon bank connection", () => {
    render(<SecurityPrivacySection />);
    expect(screen.getByTestId("security-privacy-section")).toBeDefined();
    expect(screen.getByText("How your data flows")).toBeDefined();
    expect(screen.getByText("Your manual entries")).toBeDefined();
    expect(screen.getByText("Flump planning engine (cannot make payments)")).toBeDefined();
    expect(screen.getAllByText("Bank connection (coming soon)").length).toBeGreaterThan(0);
    expect(screen.getByText("Zero data selling")).toBeDefined();
  });

  it("makes no regulatory or protocol claims", () => {
    const { container } = render(<SecurityPrivacySection />);
    expect(container.textContent ?? "").not.toMatch(/FCA|AISP|PISP|PKCE|TLS 1\.3|regulated/);
  });
});
