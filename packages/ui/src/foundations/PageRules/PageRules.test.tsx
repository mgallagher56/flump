import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PAGE_RULES, PageRules } from "./PageRules";

describe("PageRules Foundation", () => {
  it("states P1 to P13 in order", () => {
    expect(PAGE_RULES.map((r) => r.id)).toEqual(Array.from({ length: 13 }, (_, i) => `P${i + 1}`));
    render(<PageRules />);
    expect(screen.getByRole("heading", { level: 1, name: "Page rules" })).toBeDefined();
    const list = screen.getByRole("list", { name: "Page rules" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(13);
    expect(screen.getByRole("heading", { level: 2, name: "P13. Page template" })).toBeDefined();
  });

  it("gives every rule one good and one bad example", () => {
    render(<PageRules />);
    for (const rule of PAGE_RULES) {
      const card = screen.getByTestId(`page-rule-${rule.id}`);
      expect(within(card).getAllByText("Do")).toHaveLength(1);
      expect(within(card).getAllByText("Don't")).toHaveLength(1);
      expect(within(card).getByText(rule.good)).toBeDefined();
      expect(within(card).getByText(rule.bad)).toBeDefined();
    }
  });

  it("uses sentence case titles and no em dashes", () => {
    for (const rule of PAGE_RULES) {
      const words = rule.title.split(" ").slice(1);
      expect(words.every((w) => w === w.toLowerCase() || w === "Not")).toBe(true);
      for (const text of [rule.title, rule.rule, rule.good, rule.bad]) {
        expect(text).not.toContain("—");
      }
    }
  });
});
