import { colors, semanticTokens } from "@flump/tokens";
import { contrast, PASSING_PAIRS, type Theme } from "@flump/tokens/contrast";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "../../patterns/EmptyState/EmptyState";
import { Illustration } from "./Illustration";
import {
  DOCUMENT_GRID_WIDTH,
  DOCUMENT_MIN_TEXT,
  DOCUMENT_MIN_WIDTH,
  type DocumentOrbAccent,
  type DocumentPiece,
  type DocumentShape,
  documentDefinitions,
  documentEffects,
  documentInksBySurface,
  documentOrbInksByAccent,
  documentRoleTokens,
  documentSceneIds,
  documentScenes,
  EXAMPLE_TAG,
  walkDocument,
} from "./Illustration.documents";
import { illustrationScenes } from "./Illustration.scenes";
import { documentClasses, documentOrbClasses, documentOrbRoleTokens } from "./Illustration.styles";

describe("Illustration primitive", () => {
  it("offers all nine scenes from the shared shape definitions", () => {
    expect(illustrationScenes).toEqual([
      "empty-accounts",
      "empty-goals",
      "empty-savings",
      "empty-debt",
      "empty-pension",
      "check-in",
      "check-in-done",
      "onboarding",
      "not-found",
    ]);
  });

  it.each(illustrationScenes)("draws the %s scene as decorative, hidden artwork", (scene) => {
    const { container } = render(<Illustration id="art" scene={scene} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.getAttribute("focusable")).toBe("false");
    expect(svg?.getAttribute("role")).toBe("presentation");
    expect(svg?.getAttribute("data-scene")).toBe(scene);
    expect(svg?.hasAttribute("data-scene-settle")).toBe(true);
    expect(svg?.getAttribute("data-testid")).toBe("art");
    expect(svg?.querySelectorAll("title, text")).toHaveLength(0);
    expect(svg?.querySelector('[data-scene-part="sun"]')).not.toBeNull();
    expect(svg?.children.length).toBeGreaterThan(3);
  });

  it("tags sprout shapes on scenes that grow a sprout", () => {
    for (const scene of ["empty-pension", "onboarding"] as const) {
      const { container } = render(<Illustration scene={scene} />);
      expect(container.querySelector('[data-scene-part="sprout"]')).not.toBeNull();
    }
  });

  it("never embeds a raw colour", () => {
    for (const scene of illustrationScenes) {
      const { container } = render(<Illustration scene={scene} />);
      const html = container.innerHTML;
      expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(html).not.toMatch(/fill="(?!none)/);
      expect(html).not.toMatch(/stroke="/);
    }
  });

  it("slots into EmptyState with the wrapper hidden from assistive technology", () => {
    const { container } = render(
      <EmptyState illustration={<Illustration scene="empty-accounts" />} title="No accounts yet" />,
    );
    expect(container.querySelector("#empty-state-illustration")?.getAttribute("aria-hidden")).toBe(
      "true",
    );
    expect(container.querySelector('svg[data-scene="empty-accounts"]')).not.toBeNull();
  });

  it("marks sun and sprout parts with data-scene-part and supports data-scene-settle", () => {
    const { container } = render(<Illustration scene="onboarding" settle />);
    const svg = container.querySelector("svg");
    expect(svg?.hasAttribute("data-scene-settle")).toBe(true);
    expect(svg?.querySelector('[data-scene-part="sun"]')).not.toBeNull();
    expect(svg?.querySelector('[data-scene-part="sprout"]')).not.toBeNull();
  });

  it("drops data-scene-settle when settle is false", () => {
    const { container } = render(<Illustration scene="onboarding" settle={false} />);
    const svg = container.querySelector("svg");
    expect(svg?.hasAttribute("data-scene-settle")).toBe(false);
  });

  it.each([
    ["sm", "max-w_140px"],
    ["lg", "max-w_260px"],
    ["xl", "max-w_xs"],
  ] as const)("caps the %s size with %s", (size, maxWidthClass) => {
    const { container } = render(<Illustration scene="check-in" settle={false} size={size} />);
    expect(container.querySelector("svg")?.getAttribute("class")).toContain(maxWidthClass);
  });
});

/** Sample figures: an amount, a rate, or a length of time such as "10.2 months". */
const FIGURE = /£|%|\d+(\.\d+)? months?/;

const texts = (shapes: readonly DocumentShape[]) =>
  shapes.flatMap((shape): string[] =>
    shape.kind === "text"
      ? [...shape.lines]
      : shape.kind === "piece"
        ? texts(shape.shapes)
        : shape.kind === "tag"
          ? [EXAMPLE_TAG.text]
          : [],
  );

const hasTag = (piece: DocumentPiece): boolean =>
  piece.shapes.some((shape) => shape.kind === "tag" || (shape.kind === "piece" && hasTag(shape)));

describe("Illustration document pictures (STYLE-GUIDE 8.3)", () => {
  it("keeps the flat scenes as the default style", () => {
    const { container } = render(<Illustration scene="check-in" settle={false} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("viewBox")).toBe("0 0 240 180");
    expect(svg?.hasAttribute("data-variant")).toBe(false);
    expect(svg?.querySelector("text")).toBeNull();
  });

  it("offers the owner's nine picks under the flat scenes' names, then the tiles and security", () => {
    expect([...documentSceneIds]).toEqual(illustrationScenes);
    expect(documentScenes).toEqual([
      ...illustrationScenes,
      "feature-accounts",
      "feature-budget",
      "feature-pay",
      "feature-savings-pension",
      "feature-debt",
      "feature-ai-connection",
      "security",
    ]);
  });

  it.each(documentScenes)("draws %s as decorative SVG in the 300-wide grid", (scene) => {
    const { container } = render(<Illustration id="doc" scene={scene} variant="document" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.getAttribute("focusable")).toBe("false");
    expect(svg?.getAttribute("data-variant")).toBe("document");
    expect(svg?.getAttribute("data-scene")).toBe(scene);
    expect(svg?.getAttribute("viewBox")).toBe(`0 0 300 ${documentDefinitions[scene].height}`);
    // Still: no settle hook on a document picture.
    expect(svg?.hasAttribute("data-scene-settle")).toBe(false);
    // The words are real text, in order, exactly as the data lists them (a multi-line text draws
    // its lines as tspans inside one text element).
    const drawn = [...(svg?.querySelectorAll("text") ?? [])].map((t) => t.textContent);
    const listed = documentDefinitions[scene].pieces.flatMap(function flat(
      shape: DocumentShape,
    ): string[] {
      if (shape.kind === "piece") return shape.shapes.flatMap(flat);
      if (shape.kind === "text") return [shape.lines.join("")];
      if (shape.kind === "tag") return [EXAMPLE_TAG.text];
      return [];
    });
    expect(listed.length).toBeGreaterThan(0);
    expect(drawn).toEqual(listed);
  });

  it("draws the Example tag as real text, not shapes", () => {
    const { container } = render(<Illustration scene="empty-savings" variant="document" />);
    const tags = container.querySelectorAll("[data-doc-tag]");
    expect(tags).toHaveLength(1);
    const label = tags[0]?.querySelector("text");
    expect(label?.textContent).toBe("Example");
    expect(label?.getAttribute("font-size")).toBe("13");
  });

  it.each(documentScenes)(
    "tags the cards in %s that show a sample figure, and no others",
    (scene) => {
      for (const piece of documentDefinitions[scene].pieces) {
        const showsFigure = texts(piece.shapes).some((line) => FIGURE.test(line));
        // A tag exactly where a card shows a figure: never missing, never on a card without one.
        expect(hasTag(piece), `${scene}: piece at ${piece.x},${piece.y}`).toBe(showsFigure);
      }
    },
  );

  it("leaves the tag off the pictures that show no figure, as the owner picked them", () => {
    const untagged = documentScenes.filter(
      (scene) => !documentDefinitions[scene].pieces.some(hasTag),
    );
    expect(untagged).toEqual(["empty-goals", "check-in", "not-found", "security"]);
  });

  it("keeps every word at 12px or more at the narrowest width", () => {
    // 13 grid units drawn at 280px of a 300 grid: 13 * 280 / 300 = 12.13px.
    expect(DOCUMENT_GRID_WIDTH).toBe(300);
    expect(DOCUMENT_MIN_WIDTH).toBe(280);
    expect(DOCUMENT_MIN_TEXT).toBe(13);
    expect((DOCUMENT_MIN_TEXT * DOCUMENT_MIN_WIDTH) / DOCUMENT_GRID_WIDTH).toBeGreaterThanOrEqual(
      12,
    );
    expect(EXAMPLE_TAG.size).toBeGreaterThanOrEqual(DOCUMENT_MIN_TEXT);
    for (const scene of documentScenes) {
      for (const { shape } of walkDocument(documentDefinitions[scene])) {
        if (shape.kind === "text")
          expect(shape.size, `${scene}: ${shape.lines[0]}`).toBeGreaterThanOrEqual(13);
      }
    }
  });

  it.each(["sm", "md", "lg", "xl"] as const)(
    "never draws a %s document picture narrower than 280px",
    (size) => {
      const { container } = render(
        <Illustration scene="onboarding" size={size} variant="document" />,
      );
      expect(container.querySelector("svg")?.getAttribute("class")).toContain("min-w_280px");
    },
  );

  it("puts only inks that clear AA on each surface, in both themes", () => {
    for (const scene of documentScenes) {
      for (const { shape, surface } of walkDocument(documentDefinitions[scene])) {
        if (shape.kind !== "text") continue;
        expect(
          documentInksBySurface[surface],
          `${scene}: ${shape.lines[0]} on ${surface}`,
        ).toContain(shape.ink);
      }
    }
    // Each allowed pair is a checked pair in @flump/tokens (tokens.a11y.test.ts runs them).
    for (const [surface, inks] of Object.entries(documentInksBySurface)) {
      for (const ink of inks) {
        const fg = documentRoleTokens.ink[ink];
        const bg = documentRoleTokens.surface[surface as keyof typeof documentRoleTokens.surface];
        const checked = PASSING_PAIRS.some(
          (pair) =>
            pair.fg === fg &&
            pair.bg === bg &&
            pair.min === 4.5 &&
            pair.themes.includes("light") &&
            pair.themes.includes("dark"),
        );
        expect(checked, `${fg} on ${bg}`).toBe(true);
      }
    }
    // The tag's own pairs: secondary text on the sunken pill, light text on the charcoal card.
    const both = (fg: string, bg: string) =>
      PASSING_PAIRS.some(
        (p) =>
          p.fg === fg &&
          p.bg === bg &&
          p.min === 4.5 &&
          p.themes.includes("light") &&
          p.themes.includes("dark"),
      );
    expect(both(documentEffects.tag.ink, documentEffects.tag.fill)).toBe(true);
    expect(both(documentEffects.tag.onCharcoalInk, "surface.contrast")).toBe(true);
  });

  it("uses no violet, rose or raw colour (STYLE-GUIDE MC1)", () => {
    const tokens = JSON.stringify(documentRoleTokens);
    expect(tokens).not.toMatch(/violet|rose|purple|pink|series4|series5|#/);
    for (const scene of documentScenes) {
      const { container } = render(<Illustration scene={scene} variant="document" />);
      expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(container.innerHTML).not.toMatch(/fill="(?!none)/);
      // The default look never reaches the opt-in orb colours.
      expect(container.innerHTML).not.toMatch(/orb\.|data-doc-orb|data-palette/);
    }
  });

  it("tilts no piece more than six degrees", () => {
    for (const scene of documentScenes) {
      for (const piece of documentDefinitions[scene].pieces) {
        expect(Math.abs(piece.rotate), scene).toBeLessThanOrEqual(6);
      }
    }
  });
});

describe("document picture effects are one set of numbers for web and mobile", () => {
  it("draws the shadow, the tags, the charcoal strokes and the dashes from documentEffects", () => {
    const { shadow, tag, onCharcoalStrokeOpacity, dash } = documentEffects;
    expect(documentClasses.shadow).toBe(
      `fill_${shadow.token} fill-opacity_${shadow.opacity.light} dark:fill-opacity_${shadow.opacity.dark} systemDark:fill-opacity_${shadow.opacity.dark} filter_blur(${shadow.blur}px)`,
    );
    expect(documentClasses.tagPaper).toBe(`fill_${tag.fill} stk_${tag.edge} stk-w_1`);
    expect(documentClasses.tagOnCharcoal).toBe(
      `fill_none stk_${tag.onCharcoalInk} stk-op_${tag.onCharcoalEdgeOpacity}`,
    );
    expect(documentClasses.stroke.onCharcoal).toBe(
      `stk_text.onContrast stk-op_${onCharcoalStrokeOpacity}`,
    );
    expect(documentClasses.dashed).toBe(`stk-dsh_${dash.join("_")}`);
  });

  it("insets and drops the shadow by the shared numbers", () => {
    const { container } = render(<Illustration scene="feature-pay" variant="document" />);
    const shadow = container.querySelector("[data-doc-shadow]");
    const piece = documentDefinitions["feature-pay"].pieces[0];
    expect(shadow?.getAttribute("x")).toBe(String(documentEffects.shadow.inset));
    expect(shadow?.getAttribute("y")).toBe(String(documentEffects.shadow.offsetY));
    expect(shadow?.getAttribute("width")).toBe(
      String((piece?.width ?? 0) - 2 * documentEffects.shadow.inset),
    );
  });
});

/* -------------------------------------------------------------------------------------------------
 * The opt-in orb look (`palette="orb"`, marketing home page only; STYLE-GUIDE 8.3, MK5).
 * ----------------------------------------------------------------------------------------------- */

const REF = /^\{(.+)\}$/;
const lookup = (root: unknown, path: readonly string[]): unknown =>
  path.reduce<unknown>(
    (node, key) =>
      node !== null && typeof node === "object" && key in node
        ? (node as Record<string, unknown>)[key]
        : undefined,
    root,
  );
function resolveRaw(value: unknown, theme: Theme): string {
  if (typeof value === "string") {
    const ref = REF.exec(value)?.[1];
    if (!ref) return value;
    const path = ref.split(".");
    return resolveRaw(
      lookup({ colors }, path) ?? lookup({ colors: semanticTokens.colors }, path),
      theme,
    );
  }
  if (value && typeof value === "object" && "value" in value) return resolveRaw(value.value, theme);
  if (value && typeof value === "object" && "base" in value) {
    const cond = value as { base: unknown; _dark?: unknown };
    return resolveRaw(theme === "dark" && cond._dark !== undefined ? cond._dark : cond.base, theme);
  }
  throw new Error(`Cannot resolve ${JSON.stringify(value)}`);
}
/** A semantic path ("primary" is primary.DEFAULT) to its colour in a theme. */
function resolveColor(path: string, theme: Theme): string {
  let node = lookup(semanticTokens.colors, path.split("."));
  if (node && typeof node === "object" && !("value" in node)) {
    node = (node as { DEFAULT?: unknown }).DEFAULT;
  }
  if (node === undefined) throw new Error(`Unresolved token ${path}`);
  return resolveRaw(node, theme);
}
const ratio = (fg: string, bg: string, theme: Theme) =>
  contrast(
    resolveColor(fg, theme),
    resolveColor(bg, theme),
    resolveColor("material.paper.fill", theme),
  );

/** Every marked shape in a picture, with what it marks and the text inside a marked piece. */
const marked = (scene: (typeof documentScenes)[number]) =>
  walkDocument(documentDefinitions[scene])
    .map(({ shape }) => shape)
    .concat(documentDefinitions[scene].pieces)
    .filter(
      (shape): shape is Exclude<DocumentShape, { kind: "text" | "tag" }> =>
        "orb" in shape && shape.orb !== undefined,
    );

describe('the opt-in orb look (palette="orb")', () => {
  it("marks only prototype 11's recoloured shapes", () => {
    const accents = Object.fromEntries(
      documentScenes
        .map((scene) => [scene, marked(scene).map((shape) => shape.orb)] as const)
        .filter(([, list]) => list.length > 0),
    );
    expect(accents).toEqual({
      "empty-pension": ["violet", "violet"],
      "check-in": ["teal", "teal", "rose"],
      onboarding: ["violet"],
      "not-found": ["violetTint", "tealTint"],
      "feature-ai-connection": ["teal"],
    });
  });

  it.each(documentScenes)("draws %s with the same shapes and words as the default", (scene) => {
    const plain = render(<Illustration scene={scene} variant="document" />).container;
    const orb = render(<Illustration palette="orb" scene={scene} variant="document" />).container;
    const svg = orb.querySelector("svg");
    expect(svg?.getAttribute("data-palette")).toBe("orb");
    expect(svg?.querySelectorAll("*").length).toBe(
      plain.querySelector("svg")?.querySelectorAll("*").length,
    );
    expect(svg?.textContent).toBe(plain.textContent);
    expect(orb.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(svg?.querySelectorAll("[data-doc-orb]").length).toBe(marked(scene).length);
  });

  it("gives each marked shape its orb colour class, and only marked shapes", () => {
    const orbClasses = [
      ...Object.values(documentOrbClasses.fill),
      ...Object.values(documentOrbClasses.stroke),
    ];
    for (const scene of documentScenes) {
      const { container } = render(<Illustration palette="orb" scene={scene} variant="document" />);
      for (const el of container.querySelectorAll("rect, circle, path")) {
        const own = el.closest("[data-doc-orb]");
        const accent = (el.getAttribute("data-doc-orb") ??
          (el.hasAttribute("data-doc-body")
            ? own?.getAttribute("data-doc-orb")
            : null)) as DocumentOrbAccent | null;
        const cls = el.getAttribute("class") ?? "";
        if (accent) {
          expect(cls, `${scene}: ${accent}`).toMatch(documentOrbRoleTokens[accent]);
        } else {
          for (const orbClass of orbClasses) expect(cls.split(" "), scene).not.toContain(orbClass);
        }
      }
    }
  });

  it("is the only path to violet and rose in the document pictures (MK5)", () => {
    const violetRose = /violetRose|violet-rose|violet|rose|purple|pink|series4|series5/;
    // The default roles and the data never name them; only the opt-in token map does.
    expect(JSON.stringify(documentRoleTokens)).not.toMatch(violetRose);
    expect(JSON.stringify(documentDefinitions)).not.toMatch(/violetRose|purple|pink|series[45]/);
    expect(Object.values(documentOrbRoleTokens).filter((t) => violetRose.test(t))).toEqual([
      "orb.violetRose.core",
      "orb.violetRose.shade",
      "orb.violetRose.bubble",
    ]);
    for (const scene of documentScenes) {
      const plain = render(<Illustration scene={scene} variant="document" />).container.innerHTML;
      expect(plain, scene).not.toMatch(violetRose);
      const app = render(<Illustration palette="app" scene={scene} variant="document" />).container
        .innerHTML;
      expect(app, scene).toBe(plain);
    }
  });

  it("keeps every ink at 4.5:1 on its orb fill, and every orb mark at 3:1 on paper, in both themes", () => {
    for (const scene of documentScenes) {
      for (const shape of marked(scene)) {
        const accent = shape.orb as DocumentOrbAccent;
        const words =
          shape.kind === "piece"
            ? shape.shapes.filter(
                (s): s is Extract<DocumentShape, { kind: "text" }> => s.kind === "text",
              )
            : [];
        for (const word of words) {
          expect(documentOrbInksByAccent[accent], `${scene}: ${word.lines[0]}`).toContain(word.ink);
        }
      }
    }
    for (const theme of ["light", "dark"] as const) {
      for (const [accent, inks] of Object.entries(documentOrbInksByAccent)) {
        const bg = documentOrbRoleTokens[accent as DocumentOrbAccent];
        for (const ink of inks) {
          const fg = documentRoleTokens.ink[ink];
          expect(ratio(fg, bg, theme), `${fg} on ${bg} (${theme})`).toBeGreaterThanOrEqual(4.5);
        }
      }
      // The not-found tabs' arrows (primary lines) on the tints are graphics: 3:1.
      for (const tint of ["violetTint", "tealTint"] as const) {
        expect(ratio("primary", documentOrbRoleTokens[tint], theme)).toBeGreaterThanOrEqual(3);
      }
      // The violet and rose marks sit on paper: graphics, 3:1.
      for (const mark of ["violet", "rose"] as const) {
        expect(
          ratio(documentOrbRoleTokens[mark], "material.paper.fill", theme),
        ).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
