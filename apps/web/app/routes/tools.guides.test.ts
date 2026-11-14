import { ADVICE_PATTERNS } from "@flump/finance-engine";
import { TOOL_SLUGS } from "@repo/ui/tools";
import { describe, expect, it } from "vitest";
import { loader } from "./tools.$slug";

/**
 * Guide copy on the public calculator pages (advice boundary policy R1, R2, R8 and the copy
 * style guide's no-shaming rules). The advice-language guard covers the lexicon; this test adds
 * the hype, loss-framed and directive wording that earlier reviews found in these guides.
 */
const SLUGS = TOOL_SLUGS;

const HYPE_OR_DIRECTIVE = [
  /\bshould\b/i,
  /\bbest\b/i,
  /\boptimal\b/i,
  /\brecommend/i,
  /\bstrateg(y|ies)\b/i,
  /\bmitigat/i,
  /\bbeat\b/i,
  /\bescap/i,
  /\bhack/i,
  /\bphantom\b/i,
  /\bdanger\b/i,
  /\bpowerful\b/i,
  /\bdramatically\b/i,
  /\bwip(e|ed|ing)\b/i,
  /\bliving (in|continuously)\b/i,
  /\btrue cost\b/i,
  /\bpsychological\b/i,
  /\bworking harder\b/i,
  /\bmost (effective|significant)\b/i,
];

async function toolText(slug: string): Promise<string> {
  const { tool } = await loader({
    params: { slug },
    request: new Request(`http://localhost/tools/${slug}`),
  } as never);
  return [
    tool.metaTitle,
    tool.metaDescription,
    tool.title,
    tool.subtitle,
    ...tool.guideSections.flatMap((s) => [s.heading, ...s.body]),
    ...tool.faqs.flatMap((f) => [f.q, f.a]),
  ].join("\n");
}

describe("calculator guide copy", () => {
  it.each(SLUGS)("%s has no advice-shaped, hype or loss-framed wording", async (slug) => {
    const text = await toolText(slug);
    expect(HYPE_OR_DIRECTIVE.filter((p) => p.test(text)).map(String)).toEqual([]);
    expect(ADVICE_PATTERNS.filter(({ pattern }) => pattern.test(text)).map((p) => p.id)).toEqual(
      [],
    );
  });

  it("states the childcare limit as GOV.UK does: 30 hours for working parents, 15 universal hours not income-tested", async () => {
    const text = await toolText("uk-100k-tax-trap-calculator");
    expect(text).toContain("up to 30 hours of funded childcare");
    expect(text).toContain("does not depend on income");
    expect(text).not.toMatch(/15 to 30 hours|15–30 hours/i);
  });
});
