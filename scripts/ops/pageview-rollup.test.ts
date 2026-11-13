import { describe, expect, test } from "bun:test";
import { render, rollup } from "./pageview-rollup";

const line = (key: string, day: string) =>
  JSON.stringify({ type: "pageview", key, ref: null, day });

describe("pageview-rollup", () => {
  test("counts per day and key, sorted", () => {
    const out = render(
      rollup([
        line("/pricing", "2026-11-13"),
        line("/", "2026-11-13"),
        line("/pricing", "2026-11-13"),
        line("/", "2026-11-12"),
      ]),
    );
    expect(out).toBe(
      ["2026-11-12\t/\t1", "2026-11-13\t/\t1", "2026-11-13\t/pricing\t2"].join("\n"),
    );
  });

  test("tolerates timestamp prefixes and ignores other or malformed lines", () => {
    const out = render(
      rollup([
        `2026-11-13T10:00:00Z ${line("/", "2026-11-13")}`,
        "Server started at http://0.0.0.0:3001",
        '{"type":"pageview","key":',
        '{"type":"pageview","key":"/","day":"bad"}',
        "",
      ]),
    );
    expect(out).toBe("2026-11-13\t/\t1");
  });

  test("empty input renders nothing", () => {
    expect(render(rollup([]))).toBe("");
  });

  test("rejects keys with control characters, bad shapes or excess length", () => {
    const bad = ["/a\nb", "/a\tb", "/a\u001bb", "/UPPER", "//x", "/a/", "x", `/${"a".repeat(100)}`];
    expect(render(rollup(bad.map((k) => line(k, "2026-11-13"))))).toBe("");
    expect(render(rollup([line("/tools/a-b", "2026-11-13"), line("other", "2026-11-13")]))).toBe(
      "2026-11-13\t/tools/a-b\t1\n2026-11-13\tother\t1",
    );
  });
});
