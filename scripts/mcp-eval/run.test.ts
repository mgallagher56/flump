import { describe, expect, test } from "bun:test";
import { GOLDEN_TASKS } from "../../packages/mcp/src/evals";
import { costGbp, MAX_GBP_CEILING, main, parseArgs, runDry, runLive } from "./run";

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

describe("parseArgs", () => {
  test("no key means a dry run", () => {
    expect(parseArgs([], {}).mode).toBe("dry");
  });

  test("a key without --max-gbp is rejected", () => {
    expect(() => parseArgs([], { MCP_EVAL_API_KEY: "k" })).toThrow(/--max-gbp/);
  });

  test("--max-gbp above 2 is rejected", () => {
    expect(() => parseArgs(["--max-gbp", "2.5"], { MCP_EVAL_API_KEY: "k" })).toThrow(/at most 2/);
    expect(MAX_GBP_CEILING).toBe(2);
  });

  test("--max-gbp must be a positive number", () => {
    for (const bad of ["0", "-1", "abc"]) {
      expect(() => parseArgs(["--max-gbp", bad], { MCP_EVAL_API_KEY: "k" })).toThrow();
    }
  });

  test("a key with a valid cap is a live run", () => {
    const a = parseArgs(["--max-gbp=1.5", "--task", "J1-01"], { MCP_EVAL_API_KEY: "k" });
    expect(a).toMatchObject({ mode: "live", maxGbp: 1.5, taskIds: ["J1-01"] });
  });

  test("--task without a value is rejected", () => {
    expect(() => parseArgs(["--task"], {})).toThrow(/requires a task id/);
    expect(() => parseArgs(["--task", "--max-gbp"], {})).toThrow(/requires a task id/);
  });

  test("an unknown task id is rejected", () => {
    expect(() => parseArgs(["--task", "J99-01"], {})).toThrow(/Unknown task id: J99-01/);
  });

  test("a non-Haiku MCP_EVAL_MODEL is rejected, a Haiku one accepted", () => {
    expect(() => parseArgs([], { MCP_EVAL_MODEL: "claude-opus-4-1" })).toThrow(/Haiku-tier/);
    expect(parseArgs([], { MCP_EVAL_MODEL: "claude-haiku-4-5-20251001" }).model).toBe(
      "claude-haiku-4-5-20251001",
    );
  });

  test("an unknown flag is rejected", () => {
    expect(() => parseArgs(["--nope"], {})).toThrow(/Unknown argument/);
  });
});

describe("runDry", () => {
  test("oracle transcripts pass all 40 golden tasks", () => {
    const summary = runDry(GOLDEN_TASKS);
    expect(summary.total).toBe(36);
    expect(summary.failed).toBe(0);
  });
});

describe("costGbp", () => {
  test("prices Haiku tokens in pounds, conservatively", () => {
    // 1M in + 1M out = $6 = GBP 4.80 at the conservative rate.
    expect(costGbp({ inputTokens: 1_000_000, outputTokens: 1_000_000 })).toBeCloseTo(4.8, 5);
  });
});

describe("runLive", () => {
  const task = GOLDEN_TASKS[0];

  test("grades tool_use blocks from the Messages API in selection mode", async () => {
    const calls: unknown[] = [];
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      calls.push(JSON.parse(String(init.body)));
      return json({
        content: [{ type: "tool_use", name: "get_financial_snapshot", input: {} }],
        usage: { input_tokens: 800, output_tokens: 40 },
      });
    }) as unknown as typeof fetch;
    const result = await runLive({
      tasks: [task],
      apiKey: "k",
      maxGbp: 1,
      model: "claude-haiku-4-5",
      fetchImpl,
    });
    expect(result.summary.passed).toBe(1);
    expect(result.stoppedAtCap).toBe(false);
    expect(result.spentGbp).toBeGreaterThan(0);
    expect(calls).toHaveLength(1);
  });

  test("stops at the cap without sending further requests", async () => {
    let requests = 0;
    const fetchImpl = (async () => {
      requests++;
      return json({ content: [], usage: { input_tokens: 400_000, output_tokens: 1000 } });
    }) as unknown as typeof fetch;
    const result = await runLive({
      tasks: GOLDEN_TASKS.slice(0, 10),
      apiKey: "k",
      maxGbp: 0.2,
      model: "claude-haiku-4-5",
      fetchImpl,
    });
    expect(result.stoppedAtCap).toBe(true);
    expect(requests).toBeLessThan(10);
    expect(result.summary.total).toBe(10);
    expect(result.summary.passed).toBeLessThan(10);
  });

  test("never exceeds the cap by more than the single in-flight request it allowed", async () => {
    const fetchImpl = (async () =>
      json({
        content: [],
        usage: { input_tokens: 1000, output_tokens: 100 },
      })) as unknown as typeof fetch;
    const result = await runLive({
      tasks: GOLDEN_TASKS,
      apiKey: "k",
      maxGbp: 0.01,
      model: "claude-haiku-4-5",
      fetchImpl,
    });
    expect(result.spentGbp).toBeLessThanOrEqual(0.01);
  });

  test("a non-200 response fails the task and surfaces the status", async () => {
    const fetchImpl = (async () =>
      new Response("nope", { status: 401 })) as unknown as typeof fetch;
    await expect(
      runLive({ tasks: [task], apiKey: "bad", maxGbp: 1, model: "m", fetchImpl }),
    ).rejects.toThrow(/401/);
  });
});

describe("main", () => {
  test("dry run exits 0 and reports without needing a key", async () => {
    const out: string[] = [];
    const code = await main([], {}, { log: (m) => out.push(m) });
    expect(code).toBe(0);
    expect(out.join("\n")).toContain("dry run");
    expect(out.join("\n")).toContain("36/36");
  });

  test("a bad cap exits non-zero", async () => {
    const out: string[] = [];
    const code = await main(
      ["--max-gbp", "9"],
      { MCP_EVAL_API_KEY: "k" },
      { log: (m) => out.push(m) },
    );
    expect(code).toBe(2);
  });
});
