import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const HOOK = join(root, ".claude/hooks/require-model.sh");

function runHook(tool_name: string, tool_input: Record<string, unknown>) {
  return spawnSync("bash", [HOOK], {
    input: JSON.stringify({ hook_event_name: "PreToolUse", tool_name, tool_input }),
    encoding: "utf8",
  });
}

describe("require-model hook (AGENTS.md section 6)", () => {
  test("an Agent spawn with no model is blocked, and the message names the tiers", () => {
    const res = runHook("Agent", {
      description: "Review the diff",
      prompt: "Review",
      subagent_type: "implementer",
    });
    expect(res.status).toBe(2);
    expect(res.stderr).toContain("without a model (AGENTS.md section 6");
    expect(res.stderr).toContain("opus for code, tests, docs and all code review");
  });

  test("a session started with no model is blocked", () => {
    const res = runHook("mcp__ccd_session__start_session", {
      title: "Fix",
      prompt: "Fix it",
      initiation: "user_asked",
    });
    expect(res.status).toBe(2);
  });

  test("the same calls with a model pass", () => {
    expect(runHook("Agent", { prompt: "Review", model: "opus" }).status).toBe(0);
    expect(runHook("Task", { prompt: "Find", model: "sonnet" }).status).toBe(0);
    expect(runHook("mcp__ccd_session__start_session", { title: "Fix", model: "opus" }).status).toBe(
      0,
    );
  });

  test("a fork and starting a proposed card pass without a model", () => {
    expect(runHook("Agent", { prompt: "Go on", subagent_type: "fork" }).status).toBe(0);
    expect(runHook("Task", { prompt: "Go on", subagent_type: "fork" }).status).toBe(0);
    expect(runHook("mcp__ccd_session__start_session", { proposal_id: "p_1" }).status).toBe(0);
  });

  test("start_session calls where model does not apply pass: fork, cloud, preset, offer", () => {
    const start = (input: Record<string, unknown>) =>
      runHook("mcp__ccd_session__start_session", { title: "Fix", prompt: "Fix it", ...input })
        .status;
    expect(start({ context: "fork" })).toBe(0);
    expect(start({ target: "cloud" })).toBe(0);
    expect(start({ preset: "usual" })).toBe(0);
    expect(start({ initiation: "offer" })).toBe(0);
    expect(start({ context: "fresh", initiation: "own_initiative" })).toBe(2);
  });

  test("other tools pass", () => {
    expect(runHook("Bash", { command: "ls" }).status).toBe(0);
    expect(runHook("TaskStop", { task_id: "t1" }).status).toBe(0);
  });

  test("fails open: unreadable input, or no jq on PATH, lets the call go ahead", () => {
    const bad = spawnSync("bash", [HOOK], { input: "not json", encoding: "utf8" });
    expect(bad.status).toBe(0);
    const dir = mkdtempSync(join(tmpdir(), "no-jq-"));
    try {
      symlinkSync(Bun.which("bash") ?? "/bin/bash", join(dir, "bash"));
      const noJq = spawnSync(join(dir, "bash"), [HOOK], {
        input: JSON.stringify({ tool_name: "Agent", tool_input: { prompt: "x" } }),
        encoding: "utf8",
        env: { PATH: dir },
      });
      expect(noJq.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("settings.json runs the hook on exactly these tools", () => {
    const settings = JSON.parse(readFileSync(join(root, ".claude/settings.json"), "utf8")) as {
      hooks: { PreToolUse: { matcher: string; hooks: { command: string }[] }[] };
    };
    const entry = settings.hooks.PreToolUse.find((h) =>
      h.hooks.some((c) => c.command.endsWith("/.claude/hooks/require-model.sh")),
    );
    // The plain form the other hooks use. It also catches tools such as TaskStop, which the
    // hook passes (its catch-all branch); "other tools pass" covers that.
    expect(entry?.matcher).toBe("Agent|Task|mcp__ccd_session__start_session");
  });
});
