import { type ColorKey, dark, light } from "@flump/tokens/native";
import {
  DOCUMENT_GRID_WIDTH,
  type DocumentPicture,
  type DocumentShape,
  documentDefinitions,
  documentRoleTokens,
  documentSceneIds,
  documentScenes,
  EXAMPLE_TAG,
  tornEdgePath,
  walkDocument,
} from "@repo/ui/illustration-data";

/*
 * Slice F3: the document pictures' shape lists are pure data in `@repo/ui/illustration-data`, so
 * slice S9b can draw them with react-native-svg without changing them. This test pins that: the
 * module loads in the app's Jest (no DOM, no Panda), every colour role names a native theme colour
 * (checked by the compiler through `ColorKey` and at run time in both themes), and every shape kind
 * is one react-native-svg draws.
 */

// A type-only check: a role token that is not a native colour fails `check-types`.
const roleTokens: readonly ColorKey[] = [
  ...Object.values(documentRoleTokens.surface),
  ...Object.values(documentRoleTokens.ink),
  ...Object.values(documentRoleTokens.fill),
  ...Object.values(documentRoleTokens.stroke),
];

/** The react-native-svg element each shape kind becomes in S9b. */
const SVG_ELEMENT: Record<DocumentShape["kind"], string> = {
  piece: "G",
  rect: "Rect",
  circle: "Circle",
  path: "Path",
  text: "Text",
  tag: "G",
};

describe("document pictures for the mobile app", () => {
  it("loads the owner's nine picked scenes and the tiles from the shared data", () => {
    expect([...documentSceneIds]).toEqual([
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
    expect(documentScenes).toHaveLength(16);
    expect(DOCUMENT_GRID_WIDTH).toBe(300);
  });

  it.each(["light", "dark"] as const)("finds every colour role in the %s theme", (theme) => {
    const colours = theme === "light" ? light.colors : dark.colors;
    for (const token of roleTokens) {
      expect(colours[token]).toMatch(/^(#|rgba?\()/);
    }
  });

  it.each(documentScenes)("draws %s with shapes react-native-svg has", (scene) => {
    const picture: DocumentPicture = documentDefinitions[scene];
    const shapes = walkDocument(picture);
    expect(shapes.length).toBeGreaterThan(0);
    for (const { shape } of shapes) {
      expect(SVG_ELEMENT[shape.kind]).toBeDefined();
      if (shape.kind === "path") expect(shape.d).toMatch(/^M/);
      if (shape.kind === "text") expect(shape.lines.length).toBeGreaterThan(0);
    }
  });

  it("builds a receipt's torn edge the same way the web does", () => {
    // 4 teeth across 32 units, each 4 units deep, ending back on the bottom edge and closed.
    expect(tornEdgePath(32, 100, 8)).toBe(
      "M0 100 L4.0 104 L8.0 100 L12.0 104 L16.0 100 L20.0 104 L24.0 100 L28.0 104 L32.0 100 Z",
    );
    expect(EXAMPLE_TAG.text).toBe("Example");
  });
});
