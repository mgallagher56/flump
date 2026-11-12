import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TypographyScale } from "./TypographyScale";

describe("TypographyScale Foundation", () => {
  it("renders type scale and font family specimens", () => {
    render(<TypographyScale />);
    expect(screen.getByText("Flump Typography Scale & Tabular Numbers")).toBeDefined();
    expect(screen.getByText("Tabular Numbers Alignment Test")).toBeDefined();
  });

  it("renders every text style specimen", () => {
    render(<TypographyScale />);
    expect(screen.getByText("Text Styles")).toBeDefined();
    for (const name of [
      "display",
      "heading.xl",
      "body.md",
      "label.sm",
      "numeric.kpi",
      "numeric.sm",
    ]) {
      expect(screen.getByText(name)).toBeDefined();
    }
  });
});
