import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { colors, semanticTokens } from "../../tokens";
import { VisuallyHidden } from "./VisuallyHidden";

// WCAG 2.x relative luminance / contrast, computed from the token values.
function luminance(hex: string): number {
  const c = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = Number.parseInt(c.substring(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
function resolve(value: string): string {
  const m = value.match(/^\{colors\.(\w+)\.(\w+)\}$/);
  if (!m) return value;
  const scale = (colors as Record<string, Record<string, { value: string }>>)[m[1]];
  return scale[m[2]].value;
}

describe("VisuallyHidden Primitive", () => {
  it("keeps content in the accessibility tree", () => {
    render(<VisuallyHidden>Hidden</VisuallyHidden>);
    expect(screen.getByText("Hidden")).toBeDefined();
  });

  it("applies the clip recipe", () => {
    render(<VisuallyHidden>Hidden</VisuallyHidden>);
    const cls = screen.getByText("Hidden").className;
    expect(cls).toContain("pos_absolute");
    expect(cls).toContain("clip_rect(0,_0,_0,_0)");
    expect(cls).toContain("ov_hidden");
  });

  it("renders the requested element", () => {
    render(
      <table>
        <VisuallyHidden as="caption">Cap</VisuallyHidden>
      </table>,
    );
    expect(screen.getByText("Cap").tagName).toBe("CAPTION");
  });

  it("defaults to a span and forwards props", () => {
    render(<VisuallyHidden id="x">Hi</VisuallyHidden>);
    expect(screen.getByText("Hi").tagName).toBe("SPAN");
    expect(screen.getByText("Hi").id).toBe("x");
  });

  it("focusable adds the un-hide-on-focus classes", () => {
    render(<VisuallyHidden focusable>Skip</VisuallyHidden>);
    expect(screen.getByText("Skip").className).toMatch(/focus:/);
  });

  it("focus reveal pair (text.primary on surface.card) meets AA in both modes", () => {
    const text = semanticTokens.colors.text.primary.value;
    const bg = semanticTokens.colors.surface.card.value;
    const light = contrast(resolve(text.base), resolve(bg.base));
    const dark = contrast(resolve(text._dark), resolve(bg._dark));
    expect(light).toBeGreaterThanOrEqual(4.5);
    expect(dark).toBeGreaterThanOrEqual(4.5);
  });
});
