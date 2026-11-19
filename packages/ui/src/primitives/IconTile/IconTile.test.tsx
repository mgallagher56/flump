import { render, screen } from "@testing-library/react";
import { Landmark, PiggyBank } from "lucide-react";
import { describe, expect, it } from "vitest";
import { ICON_TILE_DOMAIN_TONE, IconTile } from "./IconTile";

describe("IconTile", () => {
  it("maps each domain to its one colour", () => {
    expect(ICON_TILE_DOMAIN_TONE).toEqual({
      "net-worth": "teal",
      mortgage: "teal",
      pension: "sky",
      savings: "sage",
      debt: "apricot",
      pay: "rose",
      tax: "violet",
      budget: "rose",
      accounts: "accent",
    });
  });

  it("paints the tile from the domain tint", () => {
    const { container } = render(<IconTile domain="savings" icon={PiggyBank} />);
    const tile = container.firstElementChild as HTMLElement;
    expect(tile.getAttribute("data-tile-tone")).toBe("sage");
    expect(tile.className).toContain("surface.tint.sage");
  });

  it("uses a neutral surface when no domain or tone is given", () => {
    const { container, rerender } = render(<IconTile icon={Landmark} />);
    expect(container.firstElementChild?.className).toContain("surface.subtle");
    expect(container.firstElementChild?.className).toContain("bd-c_border");
    rerender(<IconTile icon={Landmark} />);
    expect(container.firstElementChild?.getAttribute("data-tile-tone")).toBe("neutral");
  });

  it("lets an explicit tone override the domain", () => {
    const { container } = render(<IconTile domain="debt" icon={Landmark} tone="teal" />);
    expect(container.firstElementChild?.getAttribute("data-tile-tone")).toBe("teal");
  });

  it.each(["sky", "rose", "violet"] as const)("draws the %s tone on its own tint", (tone) => {
    const { container } = render(<IconTile icon={Landmark} tone={tone} />);
    const tile = container.firstElementChild as HTMLElement;
    expect(tile.getAttribute("data-tile-tone")).toBe(tone);
    expect(tile.className).toContain(`bg-c_surface.tint.${tone}`);
  });

  it("colours the glyph in its tone's series colour when asked, and in text.primary by default", () => {
    const { container, rerender } = render(<IconTile icon={Landmark} tone="rose" />);
    expect((container.firstElementChild as HTMLElement).className).toContain("c_text.primary");
    rerender(<IconTile colouredIcon icon={Landmark} tone="rose" />);
    const tile = container.firstElementChild as HTMLElement;
    expect(tile.className).toContain("c_chart.series5");
    expect(tile.className).not.toContain("c_text.primary");
  });

  it("is decorative by default and named when given a label", () => {
    const { container, rerender } = render(<IconTile domain="pension" icon={PiggyBank} />);
    expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
    rerender(<IconTile domain="pension" icon={PiggyBank} label="Pension" />);
    expect(screen.getByRole("img", { name: "Pension" })).toBeDefined();
  });

  it("uses no inline styles", () => {
    const { container } = render(<IconTile domain="mortgage" icon={Landmark} />);
    expect(container.querySelector("[style]")).toBeNull();
  });
});
