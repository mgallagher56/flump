import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { dark, light } from "@flump/tokens/native";
import { render, screen } from "@testing-library/react-native";
import { processColor } from "react-native";
import * as web from "../../../../../packages/ui/src/primitives/FlumpLogo/FlumpLogo.art";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { FlumpLogo } from "./FlumpLogo";
import { flumpLogoStates } from "./FlumpLogo.states";
import { floorLayout, LOGO_ART, LOGO_OPACITY, orbLayout } from "./FlumpLogo.styles";

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

/**
 * react-native-svg passes colours on as processed integers; inside gradients the stop opacity is in
 * the alpha byte.
 */
const asInt = (hex: string) => processColor(hex) as number;

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
  ] as const)("draws in the %s theme's logo tokens", async (scheme, set) => {
    await render(
      <ThemeProvider scheme={scheme}>
        <FlumpLogo />
      </ThemeProvider>,
    );
    const circles = svgNodes("RNSVGCircle");
    // Four layers per bubble: the backing, the tint, the second light and the sheen.
    expect(circles).toHaveLength(4 * LOGO_ART.orbs.length);
    const backings = circles.filter((c) => c.props.fill?.type === 0);
    expect(backings).toHaveLength(LOGO_ART.orbs.length);
    for (const b of backings) expect(b.props.fill?.payload).toBe(asInt(set.colors["logo.backing"]));
    const gradients = svgNodes("RNSVGRadialGradient");
    expect(gradients).toHaveLength(2 + 3 * LOGO_ART.orbs.length);
    // Each bubble's tint is its own tone at three opacities, lit by its second colour.
    LOGO_ART.orbs.forEach((orb, i) => {
      const body = gradients[2 + i * 3]?.props.gradient ?? [];
      const rim = gradients[3 + i * 3]?.props.gradient ?? [];
      const tone = asInt(set.colors[`logo.${orb.tone}`]);
      const lit = asInt(set.colors[`logo.${orb.light}`]);
      expect([body[1], body[3], body[5]].map((c) => (c ?? 0) & 0xffffff)).toEqual([
        tone & 0xffffff,
        tone & 0xffffff,
        tone & 0xffffff,
      ]);
      expect([rim[1], rim[3], rim[5]].map((c) => (c ?? 0) & 0xffffff)).toEqual([
        lit & 0xffffff,
        lit & 0xffffff,
        lit & 0xffffff,
      ]);
    });
  });

  it("has one floor shadow: a flat ellipse in light, a contact shade with a teal pool in dark", async () => {
    await render(
      <ThemeProvider scheme="light">
        <FlumpLogo />
      </ThemeProvider>,
    );
    const glints = LOGO_ART.orbs.filter((o) => o.glint).length;
    const lightFloor = svgNodes("RNSVGEllipse");
    expect(lightFloor).toHaveLength(1 + glints);
    expect(lightFloor[0]?.props.fill?.payload).toBe(asInt(light.colors["logo.shadow"]));
    await render(
      <ThemeProvider scheme="dark">
        <FlumpLogo />
      </ThemeProvider>,
    );
    expect(svgNodes("RNSVGEllipse")).toHaveLength(2 + glints);
  });

  it("places every light and the floor where the web logo does", () => {
    expect(LOGO_ART.orbs).toEqual(web.LOGO_ORBS);
    expect(LOGO_ART.floor).toEqual(web.LOGO_FLOOR);
    expect(LOGO_OPACITY).toEqual(web.LOGO_OPACITY);
    for (const orb of LOGO_ART.orbs) {
      expect(orbLayout(orb)).toEqual(web.orbLayout(orb));
    }
    expect(floorLayout(LOGO_ART.floor)).toEqual(web.floorLayout(web.LOGO_FLOOR));
  });

  it("draws the same artwork as the web logo", () => {
    const art = readFileSync(
      resolve(__dirname, "../../../../../packages/ui/src/primitives/FlumpLogo/FlumpLogo.art.ts"),
      "utf8",
    );
    const styles = readFileSync(
      resolve(__dirname, "../../../../../packages/ui/src/primitives/FlumpLogo/FlumpLogo.styles.ts"),
      "utf8",
    );
    expect(art).toContain(`LOGO_VIEWBOX = "${LOGO_ART.viewBox}"`);
    for (const o of LOGO_ART.orbs) {
      expect(art).toContain(
        `{ cx: ${o.cx}, cy: ${o.cy}, r: ${o.r}, tone: "${o.tone}", light: "${o.light}", glint: ${o.glint} }`,
      );
    }
    const { cx, cy, rx } = LOGO_ART.floor;
    expect(art).toContain(`LOGO_FLOOR = { cx: ${cx}, cy: ${cy}, rx: ${rx} }`);
    const pairs = [
      ["backing", "opacity"],
      ["core", "stopOpacity"],
      ["mid", "stopOpacity"],
      ["sheen", "stopOpacity"],
      ["glint", "opacity"],
    ] as const;
    for (const [role, prop] of pairs) {
      const l = LOGO_OPACITY.light[role];
      const d = LOGO_OPACITY.dark[role];
      expect(styles).toMatch(
        new RegExp(
          `${role}: css\\(\\{[^}]*${prop}: \\{ base: ${l}, _dark: ${d}, _systemDark: ${d} \\}`,
        ),
      );
    }
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
