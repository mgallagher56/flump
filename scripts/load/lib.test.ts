import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertLocalTarget,
  type Budget,
  budgetBreaches,
  MAX_AUTHENTICATED_PER_MINUTE,
  percentile,
  planProblem,
  type Sample,
  summarise,
  summaryMarkdown,
} from "./lib";

describe("assertLocalTarget", () => {
  test("accepts a loopback origin over http", () => {
    for (const ok of ["http://127.0.0.1:4100", "http://localhost:4100", "http://[::1]:4100"])
      expect(assertLocalTarget(ok, {}).port).toBe("4100");
  });

  test("refuses every host that is not this machine", () => {
    for (const bad of [
      "https://api.flump.co.uk",
      "http://api.flump.co.uk",
      "http://flump-backend.up.railway.app",
      "http://backend.railway.internal:4000",
      "http://staging.example.com",
      "http://10.0.0.5:4000",
      "http://192.168.1.20:4000",
      "http://0.0.0.0:4000",
      "http://127.0.0.1.example.com",
      "http://localhost.example.com",
      "http://example.com#@127.0.0.1",
      "http://127.0.0.1@example.com",
    ])
      expect(() => assertLocalTarget(bad, {})).toThrow(/refused/);
  });

  test("refuses https, credentials, paths and things that are not URLs", () => {
    for (const bad of [
      "https://127.0.0.1:4100",
      "http://user:pass@127.0.0.1:4100",
      "http://127.0.0.1:4100/api",
      "http://127.0.0.1:4100/?next=https://example.com",
      "127.0.0.1:4100",
      "",
    ])
      expect(() => assertLocalTarget(bad, {})).toThrow(/refused/);
  });

  test("refuses to run on Railway at all, even against loopback", () => {
    for (const marker of ["RAILWAY_ENVIRONMENT", "RAILWAY_PROJECT_ID", "RAILWAY_SERVICE_ID"])
      expect(() => assertLocalTarget("http://127.0.0.1:4100", { [marker]: "x" })).toThrow(marker);
  });
});

describe("percentile", () => {
  test("nearest rank", () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(percentile(values, 50)).toBe(50);
    expect(percentile(values, 95)).toBe(95);
    expect(percentile(values, 99)).toBe(99);
    expect(percentile([7], 95)).toBe(7);
    expect(percentile([], 95)).toBe(0);
  });
});

const budget: Budget = {
  routeP95Ms: 100,
  overallP95Ms: 80,
  overallP99Ms: 150,
  maxErrors: 0,
  minRequests: 4,
};

const sample = (route: string, ms: number, status = 200): Sample => ({ route, ms, status });

describe("summarise and budgetBreaches", () => {
  test("a fast, clean run is within budget", () => {
    const summary = summarise([
      sample("GET /a", 10),
      sample("GET /a", 12),
      sample("GET /b", 20),
      sample("GET /b", 22),
    ]);
    expect(summary.overall).toMatchObject({ count: 4, errors: 0, p50Ms: 12, maxMs: 22 });
    expect(Object.keys(summary.routes)).toEqual(["GET /a", "GET /b"]);
    expect(budgetBreaches(summary, budget)).toEqual([]);
  });

  test("a slow route, a failed request and a short run each break it", () => {
    const slow = summarise([
      sample("GET /a", 10),
      sample("GET /a", 10),
      sample("GET /a", 10),
      sample("GET /b", 500),
    ]);
    expect(budgetBreaches(slow, budget).join("\n")).toContain("GET /b p95 500 ms");

    const failed = summarise([
      sample("GET /a", 10),
      sample("GET /a", 10),
      sample("GET /a", 10),
      sample("GET /a", 10, 429),
    ]);
    expect(budgetBreaches(failed, budget)).toEqual(["1 requests failed; the most allowed is 0"]);

    // A request that never got a response (status 0) is an error too.
    expect(summarise([sample("GET /a", 10, 0)]).overall.errors).toBe(1);

    const short = summarise([sample("GET /a", 10)]);
    expect(budgetBreaches(short, budget)[0]).toContain("only 1 requests completed");
  });

  test("the Markdown names the verdict and every route", () => {
    const summary = summarise([sample("GET /a", 10), sample("GET /b", 500)]);
    const breaches = budgetBreaches(summary, budget);
    const markdown = summaryMarkdown(summary, budget, breaches);
    expect(markdown).toContain("Over budget");
    expect(markdown).toContain("`GET /a`");
    expect(summaryMarkdown(summary, budget, [])).toContain("Within budget.");
  });
});

describe("planProblem", () => {
  test("keeps the smoke under the backend's per-address rate limit", () => {
    expect(planProblem({ authenticatedPerSecond: 4, durationSeconds: 45 })).toBeNull();
    expect(planProblem({ authenticatedPerSecond: 5, durationSeconds: 45 })).toContain("a minute");
    expect(planProblem({ authenticatedPerSecond: 0, durationSeconds: 45 })).not.toBeNull();
    expect(planProblem({ authenticatedPerSecond: 4, durationSeconds: 301 })).not.toBeNull();
    // If the backend's ceiling changes, change this allowance with it.
    const limits = readFileSync(
      resolve(import.meta.dir, "../../apps/backend/src/security/rate-limit.decorator.ts"),
      "utf8",
    );
    const ipLimit = Number(limits.match(/IP_RATE_LIMIT[^=]*=\s*\[\{\s*limit:\s*(\d+)/)?.[1]);
    expect(ipLimit).toBeGreaterThan(MAX_AUTHENTICATED_PER_MINUTE);
  });
});

describe("budget.json", () => {
  const file = JSON.parse(readFileSync(resolve(import.meta.dir, "budget.json"), "utf8")) as {
    budget: Budget;
    baseline: { overall: { p95Ms: number; p99Ms: number } };
  };

  test("the budget is complete and allows no failed requests", () => {
    for (const key of ["routeP95Ms", "overallP95Ms", "overallP99Ms", "minRequests"] as const)
      expect(file.budget[key]).toBeGreaterThan(0);
    expect(file.budget.maxErrors).toBe(0);
  });

  test("the budget sits above the recorded baseline", () => {
    expect(file.budget.overallP95Ms).toBeGreaterThan(file.baseline.overall.p95Ms);
    expect(file.budget.overallP99Ms).toBeGreaterThan(file.baseline.overall.p99Ms);
  });
});

describe("load smoke workflow", () => {
  const workflow = readFileSync(
    resolve(import.meta.dir, "../../.github/workflows/load-smoke.yml"),
    "utf8",
  );

  test("targets the job's own backend on loopback and is not a required check", () => {
    expect(workflow).toContain("LOAD_BASE_URL: http://127.0.0.1:4100");
    // No deployed address and no repository secret: the job cannot reach or sign in to anything real.
    expect(workflow).not.toMatch(/railway\.app|flump\.co\.uk|secrets\./);
    const required = readFileSync(
      resolve(import.meta.dir, "../../.github/required-checks.json"),
      "utf8",
    );
    expect(required).not.toContain("load-smoke.yml");
  });

  test("runs on a schedule", () => {
    expect(workflow).toMatch(/schedule:\s*\n\s*- cron:/);
  });
});
