import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { marketingDurations, marketingEasings, semanticTokens } from "../../tokens";
import { MarketingTokens } from "./MarketingTokens";

type Tree = { [key: string]: unknown };
const paths = (tree: Tree, trail: string[]): string[] =>
  Object.entries(tree).flatMap(([k, v]) =>
    "value" in (v as Tree) ? [[...trail, k].join(".")] : paths(v as Tree, [...trail, k]),
  );

describe("MarketingTokens Foundation", () => {
  it("lists every orb and material token, read from the authored tokens", () => {
    render(<MarketingTokens />);
    const authored = [
      ...paths(semanticTokens.colors.orb as Tree, ["orb"]),
      ...paths(semanticTokens.colors.material as Tree, ["material"]),
    ];
    expect(authored).toHaveLength(17);
    for (const token of authored) {
      expect(screen.getByTestId(`marketing-token-${token}`).textContent).toContain(token);
    }
  });

  it("shows text on both materials", () => {
    render(<MarketingTokens />);
    for (const id of ["marketing-sample-glass", "marketing-sample-paper"]) {
      const card = within(screen.getByTestId(id));
      for (const text of ["text.primary", "text.secondary", "text.muted"]) {
        expect(card.getByText(text)).toBeDefined();
      }
    }
  });

  it("lists the calm scale with its values, and only the calm scale", () => {
    render(<MarketingTokens />);
    const rows = within(screen.getByTestId("marketing-motion-scale")).getAllByRole("row");
    // A header row plus one row per duration and easing.
    expect(rows).toHaveLength(
      1 + Object.keys(marketingDurations).length + Object.keys(marketingEasings).length,
    );
    expect(screen.getByText("durations.marketing.glide")).toBeDefined();
    expect(screen.getByText("2240ms")).toBeDefined();
    expect(screen.queryByText(/durations\.fast/)).toBeNull();
  });
});
