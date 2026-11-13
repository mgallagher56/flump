import type { FactKey } from "./input.js";

export type FigureProvenance = "user" | "derived" | "assumption";
export type FigureUnknownReason = "not-set" | "source-failed" | "unsupported-year";

/**
 * A value the engine either knows or explicitly does not. An unknown figure names the facts
 * it is missing instead of guessing. This is the shape the MCP server consumes (E17).
 */
export type Figure<T> =
  | { status: "known"; value: T; provenance: FigureProvenance; assumptions?: string[] }
  | { status: "unknown"; missing: FactKey[]; reason?: FigureUnknownReason };

export function known<T>(
  value: T,
  provenance: FigureProvenance = "derived",
  assumptions?: string[],
): Figure<T> {
  return assumptions && assumptions.length > 0
    ? { status: "known", value, provenance, assumptions }
    : { status: "known", value, provenance };
}

export function unknown<T = never>(missing: FactKey[], reason?: FigureUnknownReason): Figure<T> {
  return reason ? { status: "unknown", missing, reason } : { status: "unknown", missing };
}

export function isKnown<T>(fig: Figure<T>): fig is Extract<Figure<T>, { status: "known" }> {
  return fig.status === "known";
}
