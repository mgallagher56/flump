/**
 * Advice-language lexicon (E29-T3). Wording that reads as a personal recommendation or a
 * segment nudge, per the advice boundary rules R1 to R8 (docs/compliance/advice-boundary-policy.md).
 * No dependencies, so the web, marketing and MCP guards can all import it.
 *
 * Patterns are word-bounded so camelCase keys such as `topRecommendations` never match. Fix a
 * false positive with a permanent allow-list entry and a reason, never by loosening a pattern.
 */

export interface AdvicePattern {
  id: string;
  pattern: RegExp;
  /** The advice boundary rule this pattern enforces. */
  rule: string;
}

export const ADVICE_PATTERNS: AdvicePattern[] = [
  { id: "you-should", pattern: /\byou should\b/i, rule: "R2 personal imperative" },
  {
    id: "recommend",
    pattern: /\b(we )?recommend(s|ed|ation|ations)?\b/i,
    rule: "R2 personal recommendation",
  },
  { id: "optimal", pattern: /\boptimal\b/i, rule: "R2 optimal outcome claim" },
  {
    id: "optimise-product",
    pattern: /\boptimi[sz](e|es|ed|ing)\b (your )?(pension|ISA|savings|wealth|tax)/i,
    rule: "R2 optimise a product or pot",
  },
  {
    id: "best-choice",
    pattern: /\bbest (option|choice|strategy|product|account|deal|move)\b/i,
    rule: "R2 best-option claim",
  },
  { id: "actionable", pattern: /\bactionable\b/i, rule: "R4 call-to-action framing" },
  {
    id: "move-into-wrapper",
    pattern: /\b(move|put|invest|switch)\b.{0,40}\b(ISA|SIPP|pension|savings account)\b/i,
    rule: "R2 move money into a wrapper",
  },
  { id: "top-tier", pattern: /\btop-tier\b/i, rule: "R3 qualitative product judgement" },
  {
    id: "high-impact",
    pattern: /\b(highest|top)[- ]impact\b/i,
    rule: "R4 priority ordering by impact",
  },
  { id: "maximise", pattern: /\bmaximi[sz]e\b/i, rule: "R2 maximise claim" },
];

export interface AdviceHit {
  id: string;
  rule: string;
  /** 1-based line number in the source text. */
  line: number;
  text: string;
}

/** Blank out block comments (keeping newlines so line numbers hold) and whole-line `//` comments. */
export function stripComments(source: string): string {
  const withoutBlocks = source.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  return withoutBlocks
    .split("\n")
    .map((line) => (/^\s*\/\//.test(line) ? "" : line))
    .join("\n");
}

/** Every advice-pattern hit in `source`, after comments are stripped. */
export function findAdviceHits(source: string): AdviceHit[] {
  const hits: AdviceHit[] = [];
  stripComments(source)
    .split("\n")
    .forEach((text, i) => {
      for (const { id, pattern, rule } of ADVICE_PATTERNS) {
        if (pattern.test(text)) hits.push({ id, rule, line: i + 1, text: text.trim() });
      }
    });
  return hits;
}
