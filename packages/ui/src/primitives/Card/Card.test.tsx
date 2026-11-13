import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card } from "./Card";

describe("Card Primitive", () => {
  it("renders children with surface styling", () => {
    render(<Card>Portfolio Summary Content</Card>);
    expect(screen.getByText("Portfolio Summary Content")).toBeDefined();
  });
});

describe("Card as and tone", () => {
  it("renders a div by default", () => {
    const { container } = render(<Card>Body</Card>);
    expect(container.firstElementChild?.tagName).toBe("DIV");
  });

  it.each(["section", "article", "aside"] as const)("renders a %s", (as) => {
    const { container } = render(<Card as={as}>Body</Card>);
    expect(container.firstElementChild?.tagName).toBe(as.toUpperCase());
  });

  it("changes classes for subtle and sunken tones", () => {
    const { container } = render(
      <>
        <Card>a</Card>
        <Card tone="subtle">b</Card>
        <Card tone="sunken">c</Card>
      </>,
    );
    const classes = Array.from(container.children).map((el) => el.className);
    expect(new Set(classes).size).toBe(3);
  });
});
