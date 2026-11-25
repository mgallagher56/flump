import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { dark, light } from "@flump/tokens/native";
import { render, screen } from "@testing-library/react-native";
import { processColor } from "react-native";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { FlumpLogo } from "./FlumpLogo";
import { flumpLogoStates } from "./FlumpLogo.states";
import { LOGO_ART } from "./FlumpLogo.styles";

/** The hidden logo is still in the tree; queries skip hidden elements unless asked. */
const HIDDEN = { includeHiddenElements: true } as const;

interface SvgNode {
  type: string;
  props: { fill?: { type: number; payload?: number }; d?: string; gradient?: number[] };
  children: SvgNode[] | null;
}

function svgNodes(type: string): SvgNode[] {
  const out: SvgNode[] = [];
  const walk = (node: SvgNode) => {
    if (node.type === type) out.push(node);
    for (const child of node.children ?? []) walk(child);
  };
  walk(screen.toJSON() as unknown as SvgNode);
  return out;
}

/** react-native-svg passes colours on as processed integers (signed inside gradients). */
const asInt = (hex: string) => processColor(hex) as number;
const asSigned = (hex: string) => asInt(hex) | 0;

describe("FlumpLogo", () => {
  it("has the web logo's sizes", async () => {
    for (const [size, side] of [
      ["sm", 32],
      ["md", 50],
      ["lg", 96],
    ] as const) {
      await render(
        <ThemeProvider scheme="light">
          <FlumpLogo testID="logo" size={size} />
        </ThemeProvider>,
      );
      expect(screen.getByTestId("logo", HIDDEN).props.style).toEqual({ width: side, height: side });
    }
  });

  it("is hidden from screen readers without a label", async () => {
    await render(
      <ThemeProvider scheme="light">
        <FlumpLogo testID="logo" />
      </ThemeProvider>,
    );
    const logo = screen.getByTestId("logo", HIDDEN);
    expect(logo.props.importantForAccessibility).toBe("no-hide-descendants");
    expect(logo.props.accessibilityElementsHidden).toBe(true);
    expect(screen.queryByRole("image")).toBeNull();
  });

  it("is an image named by its label when given one", async () => {
    await render(
      <ThemeProvider scheme="light">
        <FlumpLogo label="Flump" />
      </ThemeProvider>,
    );
    expect(screen.getByRole("image", { name: "Flump" })).toBeOnTheScreen();
  });

  it.each([
    ["light", light],
    ["dark", dark],
  ] as const)("draws in the %s theme's token colours", async (scheme, set) => {
    await render(
      <ThemeProvider scheme={scheme}>
        <FlumpLogo />
      </ThemeProvider>,
    );
    const [shadow] = svgNodes("RNSVGEllipse");
    expect(shadow?.props.fill?.payload).toBe(asInt(set.colors["text.primary"]));
    const highlights = svgNodes("RNSVGPath").filter((p) => p.props.fill?.type === 0);
    expect(highlights).toHaveLength(3);
    for (const h of highlights) {
      expect(h.props.fill?.payload).toBe(asInt(set.colors["primary.foreground"]));
    }
    const [gradient] = svgNodes("RNSVGRadialGradient");
    expect(gradient?.props.gradient).toEqual([
      0,
      asSigned(set.colors["primary.hover"]),
      1,
      asSigned(set.colors["primary.solid"]),
    ]);
  });

  it("the two themes' logo colours differ, so a wrong scheme would show", () => {
    expect(light.colors["primary.solid"]).not.toBe(dark.colors["primary.solid"]);
  });

  it("draws the same artwork as the web logo", () => {
    const web = readFileSync(
      resolve(__dirname, "../../../../../packages/ui/src/primitives/FlumpLogo/FlumpLogo.tsx"),
      "utf8",
    );
    for (const d of [LOGO_ART.body, ...LOGO_ART.highlights.map((h) => h.d)]) {
      expect(web).toContain(`d="${d}"`);
    }
    expect(web).toContain(`viewBox="${LOGO_ART.viewBox}"`);
  });

  it("every state renders", async () => {
    for (const props of Object.values(flumpLogoStates)) {
      await render(
        <ThemeProvider scheme="light">
          <FlumpLogo testID="logo" {...props} />
        </ThemeProvider>,
      );
      expect(screen.getByTestId("logo", HIDDEN)).toBeOnTheScreen();
    }
  });
});
