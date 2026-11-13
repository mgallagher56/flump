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
});
