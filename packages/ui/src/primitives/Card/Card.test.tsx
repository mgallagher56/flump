import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card } from "./Card";
import { cardRecipe } from "./Card.styles";

describe("Card Primitive", () => {
  it("renders children with surface styling", () => {
    render(<Card>Portfolio Summary Content</Card>);
    expect(screen.getByText("Portfolio Summary Content")).toBeDefined();
  });
});

describe("Card as and surface", () => {
  it("renders a div by default", () => {
    const { container } = render(<Card>Body</Card>);
    expect(container.firstElementChild?.tagName).toBe("DIV");
  });

  it.each(["section", "article", "aside"] as const)("renders a %s", (as) => {
    const { container } = render(<Card as={as}>Body</Card>);
    expect(container.firstElementChild?.tagName).toBe(as.toUpperCase());
  });

  it("changes classes for subtle and sunken surfaces", () => {
    const { container } = render(
      <>
        <Card>a</Card>
        <Card surface="subtle">b</Card>
        <Card surface="sunken">c</Card>
      </>,
    );
    const classes = Array.from(container.children).map((el) => el.className);
    expect(new Set(classes).size).toBe(3);
  });
});

describe("Card material", () => {
  it("defaults to plain, which renders the same classes as before materials existed", () => {
    const { container } = render(
      <>
        <Card>a</Card>
        <Card material="plain">b</Card>
        <Card elevation="interactive">c</Card>
        <Card elevation="interactive" material="plain">
          d
        </Card>
      </>,
    );
    const [a, b, c, d] = Array.from(container.children).map((el) => el.className);
    expect(b).toBe(a);
    expect(d).toBe(c);
    expect(cardRecipe.raw({})).toEqual(cardRecipe.raw({ material: "plain" }));
    expect(cardRecipe.raw({}).backgroundColor).toBe("surface.card");
  });

  it("gives glass and paper their own fill, border and sheen or rule", () => {
    const glass = cardRecipe.raw({ material: "glass" });
    expect(glass.backgroundColor).toBe("material.glass.fill");
    expect(glass.borderColor).toBe("material.glass.border");
    expect(glass.backgroundImage).toContain("token(colors.material.glass.sheen)");
    const paper = cardRecipe.raw({ material: "paper" });
    expect(paper.backgroundColor).toBe("material.paper.fill");
    expect(paper.borderColor).toBe("material.paper.edge");
    expect(paper.backgroundImage).toContain("token(colors.material.paper.rule)");
  });

  it("wins over a surface variant", () => {
    expect(cardRecipe.raw({ material: "glass", surface: "sunken" }).backgroundColor).toBe(
      "material.glass.fill",
    );
    const { container } = render(
      <>
        <Card material="glass">a</Card>
        <Card material="glass" surface="sunken">
          b
        </Card>
      </>,
    );
    const [a, b] = Array.from(container.children).map((el) => el.className);
    expect(b).toBe(a);
  });

  // Literal variants keep Panda's static extraction happy (no dynamic `raw` calls).
  it.each([
    ["glass", "resting", cardRecipe.raw({ material: "glass", elevation: "resting" }), "glass"],
    [
      "glass",
      "interactive",
      cardRecipe.raw({ material: "glass", elevation: "interactive" }),
      "glass",
    ],
    ["glass", "floating", cardRecipe.raw({ material: "glass", elevation: "floating" }), "glass"],
    ["glass", "none", cardRecipe.raw({ material: "glass", elevation: "none" }), "none"],
    ["paper", "resting", cardRecipe.raw({ material: "paper", elevation: "resting" }), "paper"],
    ["paper", "floating", cardRecipe.raw({ material: "paper", elevation: "floating" }), "paper"],
    ["paper", "none", cardRecipe.raw({ material: "paper", elevation: "none" }), "none"],
    ["plain", "floating", cardRecipe.raw({ material: "plain", elevation: "floating" }), "floating"],
  ] as const)("%s with %s elevation casts the right shadow", (_m, _e, style, shadow) => {
    expect(style.boxShadow).toBe(shadow);
  });

  it("gives interactive glass a still hover light and the whole-border hover cue", () => {
    const style = cardRecipe.raw({ material: "glass", elevation: "interactive" }) as Record<
      string,
      any
    >;
    expect(style._hover).toEqual({ borderColor: "border.strong", boxShadow: "cardHover" });
    expect(style._before.opacity).toBe("0");
    expect(style._before.backgroundImage).toContain("token(colors.material.glass.light)");
    expect(style["@media (hover: hover)"]._hover._before).toEqual({ opacity: "1" });
    // The light's transition runs only when motion is allowed, from the motion tokens.
    expect(style._before.transitionProperty).toBeUndefined();
    expect(style._before._motionSafe).toEqual({
      transitionProperty: "opacity",
      transitionDuration: "base",
      transitionTimingFunction: "standard",
    });
  });

  it.each([
    ["glass", cardRecipe.raw({ material: "glass", elevation: "interactive" })],
    ["paper", cardRecipe.raw({ material: "paper", elevation: "interactive" })],
  ] as const)("never adds a top-only border or a transform on %s hover", (_m, raw) => {
    const style = raw as Record<string, any>;
    const hoverRules = JSON.stringify([style._hover, style["@media (hover: hover)"] ?? {}]);
    expect(hoverRules).not.toMatch(/borderTop|borderBlockStart|transform|rotate|translate/);
  });

  it("keeps paper's border on hover", () => {
    const style = cardRecipe.raw({ material: "paper", elevation: "interactive" }) as Record<
      string,
      any
    >;
    expect(style._hover.borderColor).toBe(style.borderColor);
  });

  it("gives paper no hover light", () => {
    const style = cardRecipe.raw({ material: "paper", elevation: "interactive" }) as Record<
      string,
      any
    >;
    expect(style._before).toBeUndefined();
    expect(style._hover).toEqual({ borderColor: "material.paper.edge", boxShadow: "paper" });
  });

  it("renders different classes for each material", () => {
    const { container } = render(
      <>
        <Card>a</Card>
        <Card material="glass">b</Card>
        <Card material="paper">c</Card>
      </>,
    );
    const classes = Array.from(container.children).map((el) => el.className);
    expect(new Set(classes).size).toBe(3);
  });
});
