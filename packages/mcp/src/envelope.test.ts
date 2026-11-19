import { describe, expect, it } from "vitest";
import {
  buildEnvelope,
  compactText,
  type Envelope,
  estimateTokens,
  fitToBudget,
  type ToolOutput,
  TRUNCATION_NOTE,
} from "./envelope.js";

const NOW = new Date("2026-01-01T00:00:00.000Z");
const env = <R>(o: ToolOutput<R>) => buildEnvelope(o, NOW);

/** Pads the notice with spaces until `measure(envelope)` is a whole number of tokens (a multiple of 4 characters). */
function padToTokenBoundary<R>(e: Envelope<R>, measure: (e: Envelope<R>) => string): Envelope<R> {
  let padded = e;
  while (measure(padded).length % 4 !== 0) {
    padded = { ...padded, notice: `${padded.notice ?? ""} ` };
  }
  return padded;
}

describe("buildEnvelope", () => {
  it("leaves out taxYear, verification and notice when the handler gives none", () => {
    const e = env({ result: 1 });
    expect(e).not.toHaveProperty("taxYear");
    expect(e).not.toHaveProperty("verification");
    expect(e).not.toHaveProperty("notice");
    expect(e).toMatchObject({
      schemaVersion: "2.0",
      asOf: "2026-01-01T00:00:00.000Z",
      currency: "GBP",
      assumptions: [],
      missing: [],
      truncated: false,
      nextCursor: null,
    });
  });

  it("carries taxYear, verification and notice when given", () => {
    const e = env({
      result: 1,
      taxYear: "2025/26",
      verification: { status: "verified", detail: "d" },
      notice: "n",
    });
    expect(e).toMatchObject({
      taxYear: "2025/26",
      verification: { status: "verified", detail: "d" },
      notice: "n",
    });
  });

  it("always marks user text as untrusted, even when a handler tries to say otherwise", () => {
    const e = env({ result: 1, provenance: { userText: "trusted", income: "x" } });
    expect(e.provenance).toEqual({ userText: "untrusted_data", income: "x" });
  });
});

describe("fitToBudget", () => {
  it("returns the envelope unchanged when it sits exactly on the budget", () => {
    // A result of 1 is shorter than null, so the empty-result check must not run at the boundary.
    const e = padToTokenBoundary(env({ result: 1, notice: "n" }), compactText);
    const max = compactText(e).length / 4;
    const fitted = fitToBudget(e, max);
    expect(fitted).toEqual({ ok: true, envelope: e, text: compactText(e) });
  });

  it("still shortens when the metadata alone sits exactly on the budget", () => {
    // Notice already carries the note and there is no cursor, so after halving the one-item array
    // to [] the text is the bare text less 3 characters ("[]" for "null", "true" for "false").
    const base = env({ result: ["x".repeat(200)], notice: TRUNCATION_NOTE });
    const e = padToTokenBoundary(base, (v) => compactText({ ...v, result: null }));
    const max = compactText({ ...e, result: null }).length / 4;
    const fitted = fitToBudget(e, max);
    expect(fitted.ok).toBe(true);
    if (fitted.ok) {
      expect(fitted.envelope.result).toEqual([]);
      expect(fitted.envelope.truncated).toBe(true);
      expect(estimateTokens(fitted.text)).toBeLessThanOrEqual(max);
    }
  });

  it("halves a top-level array result and sets the truncation note as the only notice", () => {
    const items = Array.from({ length: 100 }, (_, i) => `item-${i}`);
    const fitted = fitToBudget(env({ result: items, nextCursor: "c" }), 100);
    expect(fitted.ok).toBe(true);
    if (!fitted.ok) return;
    const out = fitted.envelope.result;
    // Halving 100 gives 50, 25, 12, 6, 3 or 1 items, always a prefix of the original.
    expect([50, 25, 12, 6, 3, 1]).toContain(out.length);
    expect(out).toEqual(items.slice(0, out.length));
    expect(fitted.envelope.truncated).toBe(true);
    expect(fitted.envelope.nextCursor).toBeNull();
    expect(fitted.envelope.notice).toBe(TRUNCATION_NOTE);
    expect(estimateTokens(fitted.text)).toBeLessThanOrEqual(100);
  });

  it("adds the truncation note after an existing notice, separated by a space", () => {
    const items = Array.from({ length: 100 }, (_, i) => `item-${i}`);
    const fitted = fitToBudget(env({ result: { items }, notice: "Not advice." }), 120);
    expect(fitted.ok).toBe(true);
    if (fitted.ok) expect(fitted.envelope.notice).toBe(`Not advice. ${TRUNCATION_NOTE}`);
  });

  it("halves only the largest array, wherever it sits among the keys", () => {
    const big = Array.from({ length: 200 }, (_, i) => `item-${i}`);
    const fitted = fitToBudget(env({ result: { small: ["a", "b"], big, tiny: ["c"] } }), 150);
    expect(fitted.ok).toBe(true);
    if (!fitted.ok) return;
    const r = fitted.envelope.result;
    expect(r.small).toEqual(["a", "b"]);
    expect(r.tiny).toEqual(["c"]);
    expect(r.big.length).toBeLessThan(200);
    expect(r.big.length).toBeGreaterThan(0);
  });

  it("reports unshortenable when the result has no array to shorten", () => {
    expect(fitToBudget(env({ result: { text: "x".repeat(2000) } }), 100)).toEqual({
      ok: false,
      reason: "unshortenable",
    });
  });

  it("reports unshortenable when every array in the result is already empty", () => {
    expect(fitToBudget(env({ result: { none: [], text: "x".repeat(2000) } }), 100)).toEqual({
      ok: false,
      reason: "unshortenable",
    });
  });

  it("reports overhead when the metadata alone is over budget", () => {
    expect(fitToBudget(env({ result: ["a"], notice: "x".repeat(2000) }), 100)).toEqual({
      ok: false,
      reason: "overhead",
    });
  });
});
