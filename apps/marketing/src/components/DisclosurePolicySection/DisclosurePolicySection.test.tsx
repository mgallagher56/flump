import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DisclosurePolicySection } from "./DisclosurePolicySection";

describe("DisclosurePolicySection", () => {
  it("has a level-2 heading and links to security.txt", () => {
    render(<DisclosurePolicySection />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Reporting a security issue" }),
    ).toBeDefined();
    expect(screen.getByRole("link", { name: "security.txt" }).getAttribute("href")).toBe(
      "/.well-known/security.txt",
    );
  });

  it("makes no response-time, legal-protection or bounty-payment promise", () => {
    render(<DisclosurePolicySection />);
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/within \d+|business day|safe harbou?r|legal action|reward of/i);
    expect(text).toMatch(/do not run a paid bug bounty/i);
  });
});
