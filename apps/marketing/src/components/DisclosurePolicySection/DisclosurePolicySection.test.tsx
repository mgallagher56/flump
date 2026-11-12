import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DisclosurePolicySection } from "./DisclosurePolicySection";

describe("DisclosurePolicySection", () => {
  it("has a level-2 heading and says no security contact is available yet", () => {
    render(<DisclosurePolicySection />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Reporting a security issue" }),
    ).toBeDefined();
    expect(document.body.textContent).toMatch(/security contact is not available yet/i);
    expect(document.body.textContent).toMatch(/published here at launch/i);
  });

  it("shows no dead contact: no mailto link, security.txt link or placeholder address", () => {
    render(<DisclosurePolicySection />);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(document.body.textContent).not.toMatch(/example\.invalid|security\.txt|PLACEHOLDER/i);
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
