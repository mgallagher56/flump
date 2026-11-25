import { render } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { StyleSheet, type TextStyle } from "react-native";
import { ThemeProvider } from "../theme/ThemeProvider";

/** A host node as `screen.toJSON()` returns it. */
interface HostNode {
  type: string;
  props: Record<string, unknown>;
  children: (HostNode | string)[] | null;
}

interface TextNode {
  readonly node: HostNode;
  /** Host nodes from the root down to (not including) the text node. */
  readonly ancestors: readonly HostNode[];
}

function textNodes(tree: unknown): TextNode[] {
  const out: TextNode[] = [];
  const walk = (node: HostNode | string, ancestors: HostNode[]) => {
    if (typeof node === "string") return;
    if (node.type === "Text") out.push({ node, ancestors });
    for (const child of node.children ?? []) walk(child, [...ancestors, node]);
  };
  const roots = Array.isArray(tree) ? tree : tree ? [tree] : [];
  for (const root of roots as HostNode[]) walk(root, []);
  return out;
}

const styleOf = (node: HostNode): TextStyle =>
  (StyleSheet.flatten(node.props.style as TextStyle) ?? {}) as TextStyle;

async function textAt(ui: ReactElement, textScale: number): Promise<TextNode[]> {
  const view = await render(
    <ThemeProvider scheme="light" textScale={textScale}>
      {ui}
    </ThemeProvider>,
  );
  return textNodes(view.toJSON());
}

export interface DoubleTextOptions {
  /** The state truncates on purpose (Text's `truncate` or `lineClamp`). */
  readonly truncates?: boolean;
}

/**
 * The structural half of "renders at 200% text without clipping" (plan 9.4, acceptance 2). Jest has
 * no layout engine, so this checks what would clip on a phone: every text node doubles in size and
 * line height at a text scale of 2; no ancestor of a text node has a fixed height or maximum
 * height; nothing truncates unless the state asks to; and at the normal scale nothing turns the
 * system text size off or caps it below 200%. How it looks on a real phone is checked by hand.
 */
export async function expectHoldsAtDoubleText(
  ui: ReactElement,
  { truncates = false }: DoubleTextOptions = {},
): Promise<void> {
  const normal = await textAt(ui, 1);
  const doubled = await textAt(ui, 2);

  expect(normal.length).toBeGreaterThan(0);
  expect(doubled).toHaveLength(normal.length);

  for (const { node } of normal) {
    expect(node.props.allowFontScaling).not.toBe(false);
    const cap = node.props.maxFontSizeMultiplier;
    if (typeof cap === "number" && cap !== 0) expect(cap).toBeGreaterThanOrEqual(2);
  }

  doubled.forEach(({ node, ancestors }, i) => {
    const before = styleOf((normal[i] as TextNode).node);
    const after = styleOf(node);
    expect(after.fontSize).toBe((before.fontSize as number) * 2);
    if (before.lineHeight !== undefined) expect(after.lineHeight).toBe(before.lineHeight * 2);
    if (!truncates) expect(node.props.numberOfLines ?? 0).toBe(0);
    for (const ancestor of ancestors) {
      const box = styleOf(ancestor);
      expect({ type: ancestor.type, height: box.height, maxHeight: box.maxHeight }).toEqual({
        type: ancestor.type,
        height: undefined,
        maxHeight: undefined,
      });
    }
  });
}
