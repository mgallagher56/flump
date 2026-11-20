import type { MissingKey } from "./input.js";

export type FigureProvenance = "user" | "derived" | "assumption";
/**
 * "ambiguous-home": more than one property could be the home, so a home figure is left out.
 * "rates-not-published": the year's rates for this person are not published (Scottish 2027/28),
 * so the figure is refused; `notice` carries the line to show instead.
 */
export type FigureUnknownReason =
  | "not-set"
  | "source-failed"
  | "unsupported-year"
  | "ambiguous-home"
  | "rates-not-published";

/**
 * A value the engine either knows or explicitly does not. An unknown figure names the facts
 * it is missing instead of guessing. This is the shape the MCP server consumes (E17).
 */
export type Figure<T> =
  | { status: "known"; value: T; provenance: FigureProvenance; assumptions?: string[] }
  | { status: "unknown"; missing: MissingKey[]; reason?: FigureUnknownReason; notice?: string };

export function figureKnown<T>(
  value: T,
  provenance: FigureProvenance = "derived",
  assumptions?: string[],
): Figure<T> {
  return assumptions && assumptions.length > 0
    ? { status: "known", value, provenance, assumptions }
    : { status: "known", value, provenance };
}

export function figureUnknown<T = never>(
  missing: MissingKey[],
  reason?: FigureUnknownReason,
  notice?: string,
): Figure<T> {
  if (!reason) return { status: "unknown", missing };
  return notice
    ? { status: "unknown", missing, reason, notice }
    : { status: "unknown", missing, reason };
}

/** An unknown figure for a refusal (a rate or threshold not published), with its notice. */
export function figureRefused<T = never>(refusal: { notice: string }): Figure<T> {
  return figureUnknown<T>([], "rates-not-published", refusal.notice);
}

export function isFigureKnown<T>(fig: Figure<T>): fig is Extract<Figure<T>, { status: "known" }> {
  return fig.status === "known";
}
