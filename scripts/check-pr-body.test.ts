import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bodyLength, checkPrBody, type PrBodyInput } from "./lib/pr-body";

const FIXTURES = join(import.meta.dir, "__fixtures__", "pr-body");

/** Real merged PRs, saved with `gh pr view <n> --json title,body,author`. */
function realPr(n: number): PrBodyInput {
  const raw = JSON.parse(readFileSync(join(FIXTURES, `pr-${n}.json`), "utf8"));
  return { title: raw.title, body: raw.body, author: raw.author };
}

const GOOD = [
  "One line on what changed.",
  "",
  "**Tests**: two cases, each seen failing.",
  "",
  "**Guard changes**: None",
  "",
  "**Reviewed by**: fresh opus reviewer.",
].join("\n");

describe("checkPrBody on real past PRs", () => {
  test("#890 (4896 characters, after the 22 Nov cap) fails on length only", () => {
    const errors = checkPrBody(realPr(890));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("4896 characters; the cap is 1000");
  });

  test('#910 had no "Guard changes" line and fails on that alone', () => {
    const errors = checkPrBody(realPr(910));
    expect(errors).toEqual([
      expect.stringContaining('No "Guard changes" line (AGENTS.md section 15)'),
    ]);
  });

  test("#927 (992 characters, every heading) passes", () => {
    expect(checkPrBody(realPr(927))).toEqual([]);
  });
});

describe("checkPrBody rules", () => {
  test("a body of exactly 1000 characters passes and 1001 fails", () => {
    const pad = (n: number) => `${GOOD}\n${"x".repeat(n - GOOD.length - 1)}`;
    expect(bodyLength(pad(1000))).toBe(1000);
    expect(checkPrBody({ title: "t", body: pad(1000) })).toEqual([]);
    expect(checkPrBody({ title: "t", body: pad(1001) })[0]).toContain("1001 characters");
  });

  test("an emoji counts once and a CRLF line end counts once", () => {
    // "🤖" is one code point (two UTF-16 units); "a\r\nb" is three characters as GitHub shows it.
    expect(bodyLength("🤖")).toBe(1);
    expect(bodyLength("a\r\nb")).toBe(3);
  });

  test("each missing heading is named", () => {
    expect(checkPrBody({ title: "t", body: GOOD.replace("**Tests**", "Testing") })).toEqual([
      expect.stringContaining('No "Tests" line'),
    ]);
    expect(checkPrBody({ title: "t", body: GOOD.replace("**Reviewed by**", "Seen") })).toEqual([
      expect.stringContaining('No "Review" line'),
    ]);
  });

  test("heading styles: markdown heading, bold, plain and bulleted all count", () => {
    for (const line of ["## Tests", "**Tests**:", "Tests: none", "- **Tests**: x"]) {
      const body = GOOD.replace("**Tests**: two cases, each seen failing.", line);
      expect(checkPrBody({ title: "t", body })).toEqual([]);
    }
  });

  test("every review line form counts (#925, #916 and #912 used Reviewer and Reviewers)", () => {
    for (const line of [
      "**Reviewer**: x",
      "Reviewers: x",
      "**Reviewed**: x",
      "## Review",
      "Reviewed by: x",
    ]) {
      const body = GOOD.replace("**Reviewed by**: fresh opus reviewer.", line);
      expect(checkPrBody({ title: "t", body })).toEqual([]);
    }
  });

  test("a heading word mid-sentence does not count", () => {
    const body = GOOD.replace("**Tests**: two cases", "Ran the Tests: two cases");
    expect(checkPrBody({ title: "t", body })).toEqual([expect.stringContaining('No "Tests"')]);
  });

  test("an em dash fails", () => {
    expect(checkPrBody({ title: "t", body: `${GOOD}\nA — B` })).toEqual([
      expect.stringContaining("em dash"),
    ]);
  });

  test("release-please and Renovate PRs are exempt; a person's release-looking title is not", () => {
    const long = "x".repeat(5000);
    expect(checkPrBody({ title: "chore(main): release 1.2.0", body: long })).toEqual([]);
    expect(checkPrBody({ title: "fix(deps): bump", body: long, author: "renovate[bot]" })).toEqual(
      [],
    );
    expect(checkPrBody({ title: "chore: release notes", body: long }).length).toBeGreaterThan(0);
  });
});

describe("check-pr-body CLI", () => {
  const run = (args: string[], input: string) =>
    spawnSync("bun", [join(import.meta.dir, "check-pr-body.ts"), ...args], {
      input,
      encoding: "utf8",
    });

  test("stdin from gh pr view: #890 exits 1 with the length message, #927 exits 0", () => {
    const bad = run(["-"], readFileSync(join(FIXTURES, "pr-890.json"), "utf8"));
    expect(bad.status).toBe(1);
    expect(bad.stderr).toContain("the cap is 1000");
    const good = run(["-"], readFileSync(join(FIXTURES, "pr-927.json"), "utf8"));
    expect(good.status).toBe(0);
  });

  test("gh's nested author object is read", () => {
    const view = JSON.stringify({ title: "x", body: "short", author: { login: "renovate[bot]" } });
    expect(run(["-"], view).status).toBe(0);
  });

  test("the pull_request event file is read in CI", () => {
    const dir = mkdtempSync(join(tmpdir(), "pr-body-"));
    const path = join(dir, "event.json");
    const pr = realPr(910);
    writeFileSync(path, JSON.stringify({ pull_request: { title: pr.title, body: pr.body } }));
    const res = run(["--event", path], "");
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('No "Guard changes" line');
  });

  test("no input at all exits 2 with the local command", () => {
    const res = run([], "");
    expect(res.status).toBe(2);
    expect(res.stderr).toContain("gh pr view");
  });
});
