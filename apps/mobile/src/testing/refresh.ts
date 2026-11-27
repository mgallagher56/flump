/**
 * Tests only: the pull-to-refresh control of the screen on show, as its scroll view holds it (the
 * Jest mock of the control draws no props of its own).
 */
import { screen } from "@testing-library/react-native";
import type { ReactElement } from "react";

interface Node {
  type: string;
  props: Record<string, unknown>;
  children?: (Node | string)[] | null;
}

interface RefreshControlProps {
  refreshing: boolean;
  onRefresh(): Promise<void> | void;
}

function findScroll(node: Node | string | null | undefined): Node | null {
  if (!node || typeof node === "string") return null;
  if (node.type === "RCTScrollView") return node;
  for (const child of node.children ?? []) {
    const found = findScroll(child);
    if (found) return found;
  }
  return null;
}

/** The first scroll view's refresh control props, or undefined when it has none. */
export function refreshControl(): RefreshControlProps | undefined {
  const json = screen.toJSON() as unknown as Node | Node[] | null;
  const roots = Array.isArray(json) ? json : [json];
  for (const root of roots) {
    const scroll = findScroll(root);
    if (scroll) {
      const element = scroll.props.refreshControl as ReactElement<RefreshControlProps> | undefined;
      return element?.props;
    }
  }
  return undefined;
}
