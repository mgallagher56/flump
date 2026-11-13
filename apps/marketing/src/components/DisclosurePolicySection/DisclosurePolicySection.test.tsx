import { BUSINESS_DETAILS } from "@flump/business-details";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DisclosurePolicySection } from "./DisclosurePolicySection";

describe("DisclosurePolicySection", () => {
  it("has a level-2 heading and the configured security contact", () => {
    render(<DisclosurePolicySection />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Reporting a security issue" }),
    ).toBeDefined();
    const value = BUSINESS_DETAILS.securityContact.value;
    expect(screen.getByRole("link", { name: value }).getAttribute("href")).toBe(`mailto:${value}`);
    expect(document.body.textContent).not.toMatch(/security contact is not available yet/i);
  });

  it("makes no response-time, legal-protection or bounty-payment promise", () => {
    render(<DisclosurePolicySection />);
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(
      /within \d+|business day|within the hour|safe harbou?r|legal action|reward of/i,
    );
    expect(text).toMatch(/do not run a paid bug bounty/i);
  });
});
