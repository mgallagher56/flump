import { describe, expect, test } from "bun:test";
import {
  countTurboCache,
  median,
  parseDurationLine,
  parseHumanDuration,
  parsePlaywrightJson,
  parsePlaywrightLogSummary,
  parseVitestJson,
  playwrightCacheState,
  slowestFiles,
  summariseRuns,
} from "./lib/test-timings";

const vitestFixture = {
  numTotalTests: 5,
  numPassedTests: 4,
  numFailedTests: 1,
  testResults: [
    { name: "/repo/pkg/a.test.ts", startTime: 1000, endTime: 1500 },
    { name: "/repo/pkg/b.test.ts", startTime: 1100, endTime: 4100 },
    { name: "/repo/pkg/c.test.ts", startTime: 1200, endTime: 1300 },
  ],
};

describe("vitest JSON", () => {
  test("file durations are end minus start, wall time spans the first start to the last end", () => {
    const s = parseVitestJson(vitestFixture, "/repo");
    // b: 4100 - 1100 = 3000. Wall: 4100 - 1000 = 3100.
    expect(s.files.find((f) => f.file === "pkg/b.test.ts")?.durationMs).toBe(3000);
    expect(s.wallMs).toBe(3100);
    expect(s.fileCount).toBe(3);
    expect(s.failedTests).toBe(1);
  });

  test("slowest files come back longest first and are capped", () => {
    const top = slowestFiles(parseVitestJson(vitestFixture, "/repo").files, 2);
    expect(top.map((f) => f.file)).toEqual(["pkg/b.test.ts", "pkg/a.test.ts"]);
  });

  test("an empty report has zero wall time", () => {
    expect(parseVitestJson({}).wallMs).toBe(0);
  });
});

describe("duration line", () => {
  test("reads human durations", () => {
    expect(parseHumanDuration("687ms")).toBe(687);
    expect(parseHumanDuration("2.5s")).toBe(2500);
    expect(parseHumanDuration("2m 3s")).toBe(123_000);
    expect(parseHumanDuration("nonsense")).toBeNull();
  });

  test("Vitest 5 style: shares of the total", () => {
    const split = parseDurationLine(
      "   Start at  13:07:53\n   Duration  10s (import 40%, transform 30%, tests 20%, worker 10%)\n",
    );
    expect(split?.totalMs).toBe(10_000);
    // 40% of 10 s = 4 s; 20% of 10 s = 2 s.
    expect(split?.parts.find((p) => p.name === "import")?.ms).toBe(4000);
    expect(split?.parts.find((p) => p.name === "tests")?.ms).toBe(2000);
  });

  test("older style: times per part", () => {
    const split = parseDurationLine(
      "   Duration  3.2s (transform 120ms, setup 0ms, import 1s, tests 500ms, environment 1.2s)",
    );
    expect(split?.parts.map((p) => [p.name, p.ms])).toEqual([
      ["transform", 120],
      ["setup", 0],
      ["import", 1000],
      ["tests", 500],
      ["environment", 1200],
    ]);
  });

  test("no Duration line gives null", () => {
    expect(parseDurationLine("Test Files  1 passed")).toBeNull();
  });
});

describe("turbo cache lines", () => {
  test("counts hits and misses per task", () => {
    const log = [
      "@flump/web:test:coverage: cache hit, replaying logs 8c72f856d107622c",
      "@flump/ui:test:coverage: cache miss, executing 02f5dac278f0c4d9",
      "@flump/format:test:coverage: cache hit, suppressing logs 59dea09c3173415f",
      "unrelated line",
    ].join("\n");
    expect(countTurboCache(log)).toEqual({ hit: 2, miss: 1 });
  });
});

describe("playwright cache step", () => {
  test("hit, miss and absent", () => {
    const row = (text: string) => `job\t🗂️ Cache Playwright browsers\t2026-11-19T12:44:13Z ${text}`;
    expect(
      playwrightCacheState(row("Cache hit occurred on the primary key x, not saving cache.")),
    ).toBe("hit");
    expect(playwrightCacheState(row("Cache not found for input keys: x"))).toBe("miss");
    expect(
      playwrightCacheState("job\tOther step\tCache hit occurred on the primary key x"),
    ).toBeNull();
    expect(
      playwrightCacheState(
        "job\tPost 🗂️ Cache Playwright browsers\tCache not found for input keys: x",
      ),
    ).toBeNull();
  });
});

function job(
  name: string,
  start: string,
  end: string,
  steps: [string, string, string, string?][] = [],
) {
  return {
    name,
    conclusion: "success",
    startedAt: start,
    completedAt: end,
    steps: steps.map(([n, s, e, c]) => ({
      name: n,
      conclusion: c ?? "success",
      startedAt: s,
      completedAt: e,
    })),
  };
}

describe("run summary", () => {
  const t = (s: number) => new Date(Date.UTC(2026, 10, 19, 12, 0, s)).toISOString();
  const runs = [
    {
      id: 1,
      conclusion: "success",
      jobs: [
        job("Lint", t(0), t(40), [["Install Chromium", t(0), t(10)]]),
        job("Storybook", t(0), t(100), [["Install Chromium", t(5), t(105 - 5)]]),
        job("Docs", t(0), t(200)),
      ],
    },
    {
      id: 2,
      conclusion: "success",
      jobs: [
        job("Lint", t(0), t(60), [["Install Chromium", t(0), t(30)]]),
        job("Storybook", t(0), t(300), [["Install Chromium", t(0), t(0), "skipped"]]),
        job("Docs", t(0), t(210)),
      ],
    },
  ];

  test("job medians, ranges and counts", () => {
    const s = summariseRuns(runs, ["Lint", "Storybook"]);
    const lint = s.jobs.find((j) => j.name === "Lint");
    // Two runs: 40 s and 60 s. Median of two is their mean.
    expect(lint).toMatchObject({ count: 2, min: 40_000, max: 60_000, median: 50_000 });
  });

  test("skipped steps are not counted", () => {
    const s = summariseRuns(runs);
    expect(s.steps.find((x) => x.name === "Storybook / Install Chromium")?.count).toBe(1);
    expect(s.steps.find((x) => x.name === "Lint / Install Chromium")?.count).toBe(2);
  });

  test("required wall time only covers required jobs", () => {
    const s = summariseRuns(runs, ["Lint", "Storybook"]);
    // Run 1: latest required end 100 s. Run 2: 300 s. Docs (200 and 210 s) is not required.
    expect(s.requiredWall).toMatchObject({ min: 100_000, max: 300_000, median: 200_000 });
    // All jobs: run 1 ends at 200 s, run 2 at 300 s.
    expect(s.runWall).toMatchObject({ min: 200_000, max: 300_000 });
  });

  test("slowest job per run ignores queueing between jobs", () => {
    const s = summariseRuns(runs);
    // Run 1 longest job: Docs 200 s. Run 2: Storybook 300 s.
    expect(s.slowestJob).toMatchObject({ min: 200_000, max: 300_000 });
  });

  test("median of an odd count is the middle value", () => {
    expect(median([5, 1, 3])).toBe(3);
  });
});

describe("playwright", () => {
  test("sums test time per project", () => {
    const report = {
      stats: { duration: 78_000 },
      suites: [
        {
          suites: [
            {
              specs: [
                {
                  tests: [
                    { projectName: "smoke", results: [{ duration: 1000 }, { duration: 500 }] },
                  ],
                },
                { tests: [{ projectName: "a11y", results: [{ duration: 200 }] }] },
              ],
            },
          ],
        },
      ],
    };
    const s = parsePlaywrightJson(report);
    expect(s.wallMs).toBe(78_000);
    // smoke: 1000 + 500 retry = 1500 ms across 1 test.
    expect(s.projects[0]).toEqual({ project: "smoke", tests: 1, testMs: 1500 });
  });

  test("list reporter summary line", () => {
    expect(parsePlaywrightLogSummary("  90 passed (1.3m)\n")).toEqual({
      passed: 90,
      failed: 0,
      wallMs: 78_000,
    });
    expect(parsePlaywrightLogSummary("nothing here")).toBeNull();
  });
});
