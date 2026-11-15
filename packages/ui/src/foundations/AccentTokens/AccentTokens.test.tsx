import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { semanticTokens } from "../../tokens";
import { AccentTokens } from "./AccentTokens";

describe("AccentTokens Foundation", () => {
  it("lists every accent token", () => {
    render(<AccentTokens />);
    expect(screen.getByRole("heading", { name: "Accent" })).toBeDefined();
    const authored = Object.keys(semanticTokens.colors.accent).map((key) =>
      key === "DEFAULT" ? "accent" : `accent.${key}`,
    );
    for (const token of [...authored, "chart.accent"]) {
      expect(screen.getByTestId(`accent-token-${token}`)).toBeDefined();
    }
  });

  it("shows the permitted pairings", () => {
    render(<AccentTokens />);
    for (const id of ["accent-sample-card", "accent-sample-plain", "accent-sample-hero"]) {
      expect(screen.getByTestId(id)).toBeDefined();
    }
  });
});
