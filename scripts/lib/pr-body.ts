/**
 * The PR description rules of AGENTS.md sections 8, 12, 15 and 17, as one pure check. The CLI is
 * scripts/check-pr-body.ts; CI runs it in .github/workflows/pr-description.yml.
 */

export const PR_BODY_MAX_CHARS = 1000;

/**
 * Release-please and Renovate write their own bodies; the laws are for agent-written PRs.
 * Renovate is exempt by author ("renovate[bot]" in the event, "app/renovate" in gh). Release PRs
 * are opened with the owner's token, so their author is a person: they are exempt by their head
 * branch, which only release-please writes. A title alone never exempts a PR.
 */
const EXEMPT_AUTHORS = new Set(["renovate[bot]", "app/renovate"]);
const RELEASE_PLEASE_BRANCH = /^release-please--/;

/**
 * Each heading is a line that opens with its name, as `## Tests`, `**Tests**:`, `Tests:` or
 * `- **Tests**`. Literal patterns, not built from strings (Semgrep regex_dos).
 */
const REQUIRED_HEADINGS: { name: string; pattern: RegExp; law: string }[] = [
  {
    name: "Tests",
    pattern: /^[ \t]*(?:[-*][ \t]+)?(?:#{1,6}[ \t]*)?(?:\*\*)?Tests\b/im,
    law: "section 17",
  },
  {
    name: "Guard changes",
    pattern: /^[ \t]*(?:[-*][ \t]+)?(?:#{1,6}[ \t]*)?(?:\*\*)?Guard changes\b/im,
    law: "section 15",
  },
  {
    name: "Review",
    pattern: /^[ \t]*(?:[-*][ \t]+)?(?:#{1,6}[ \t]*)?(?:\*\*)?Review(?:ers?|ed(?:[ \t]+by)?)?\b/im,
    law: "section 12",
  },
];

export interface PrBodyInput {
  title: string;
  body: string;
  author?: string;
  headRef?: string;
}

export function isExempt({ author, headRef }: PrBodyInput): boolean {
  return (
    (author !== undefined && EXEMPT_AUTHORS.has(author)) ||
    (headRef !== undefined && RELEASE_PLEASE_BRANCH.test(headRef))
  );
}

/** Characters as GitHub counts them: code points, with CRLF line ends counted once. */
export function bodyLength(body: string): number {
  return [...body.replace(/\r\n/g, "\n")].length;
}

/** Every broken rule, each message naming the fix. Empty when the description passes. */
export function checkPrBody(input: PrBodyInput): string[] {
  if (isExempt(input)) return [];
  const body = input.body.replace(/\r\n/g, "\n");
  const errors: string[] = [];
  const length = bodyLength(body);
  if (length > PR_BODY_MAX_CHARS) {
    errors.push(
      `The description is ${length} characters; the cap is ${PR_BODY_MAX_CHARS} (AGENTS.md section 8). Move detail into the code, tests or plan documents and keep each heading to a line or two.`,
    );
  }
  for (const heading of REQUIRED_HEADINGS) {
    if (!heading.pattern.test(body)) {
      errors.push(
        `No "${heading.name}" line (AGENTS.md ${heading.law}). Start a line with "**${heading.name}**:" or "## ${heading.name}"${heading.name === "Guard changes" ? ', and write "None" when there are none' : ""}.`,
      );
    }
  }
  if (body.includes("—")) {
    errors.push(
      "The description has an em dash (AGENTS.md section 11). Use a colon, a comma or a full stop instead.",
    );
  }
  return errors;
}
