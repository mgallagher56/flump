import { describe, expect, it } from "vitest";
import { findAdviceHits } from "./advice-lexicon.js";

describe("findAdviceHits comment handling", () => {
  it("ignores an indented whole-line comment", () => {
    expect(findAdviceHits("function f() {\n    // you should not see this\n}")).toEqual([]);
  });

  it("still checks code that has a trailing comment after it", () => {
    const hits = findAdviceHits('const a = "the optimal mix"; // note');
    expect(hits).toEqual([expect.objectContaining({ id: "optimal", line: 1 })]);
  });

  it("reports the hit's line without its indentation", () => {
    const hits = findAdviceHits('    const a = "optimal";   ');
    expect(hits[0]?.text).toBe('const a = "optimal";');
  });
});
