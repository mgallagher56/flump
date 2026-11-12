import { describe, expect, it } from "vitest";
import { ADVICE_PATTERNS, findAdviceHits } from "./advice-lexicon.js";

const idsFor = (text: string) => findAdviceHits(text).map((h) => h.id);

describe("ADVICE_PATTERNS", () => {
  it("has unique ids and a rule reference on every pattern", () => {
    const ids = ADVICE_PATTERNS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of ADVICE_PATTERNS) expect(p.rule).toMatch(/^R\d/);
  });

  it.each([
    ["You should move this to an ISA", "you-should"],
    ["We recommend a Stocks and Shares ISA", "recommend"],
    ["recommended monthly amount", "recommend"],
    ["the optimal split", "optimal"],
    ["Optimise your pension today", "optimise-product"],
    ["optimizing tax", "optimise-product"],
    ["the best option for you", "best-choice"],
    ["Actionable optimisation", "actionable"],
    ["Move your spare cash into an ISA", "move-into-wrapper"],
    ["a top-tier Cash ISA", "top-tier"],
    ["highest-impact actions", "high-impact"],
    ["Maximise your allowance", "maximise"],
    ["maximize returns", "maximise"],
  ])("flags %j as %s", (text, id) => {
    expect(idsFor(text)).toContain(id);
  });

  it.each([
    "topRecommendations",
    "recommendedSacrifice",
    "Guidance, not advice.",
    "Optimise the layout of your settings",
    "The ISA allowance resets on 6 April.",
    "A neutral observation about your pension.",
  ])("does not flag %j", (text) => {
    expect(idsFor(text)).toEqual([]);
  });
});

describe("findAdviceHits", () => {
  it("ignores block comments and whole-line comments", () => {
    const src = ["/* You should do this */", "// we recommend that", "const a = 1;"].join("\n");
    expect(findAdviceHits(src)).toEqual([]);
  });

  it("reports the 1-based line of a hit in code", () => {
    const hits = findAdviceHits('const a = 1;\nconst b = "You should move it";');
    expect(hits).toEqual([expect.objectContaining({ id: "you-should", line: 2 })]);
  });

  it("keeps line numbers stable after a stripped block comment", () => {
    const hits = findAdviceHits('/* a\nb */\nconst b = "optimal";');
    expect(hits[0]?.line).toBe(3);
  });
});
