/**
 * MCP eval runner skeleton (E17-N21, T7.4 skeleton).
 *
 *   bun scripts/mcp-eval/run.ts                       dry run: oracle transcripts through the graders
 *   MCP_EVAL_API_KEY=... bun scripts/mcp-eval/run.ts --max-gbp 1.5
 *                                                     live tool-selection run on the Haiku tier
 *
 * Scope of the live mode, stated plainly: it sends each golden task's prompt, the persona's rows
 * and the catalogue v2 tool names to the Messages API and grades the tools and arguments the
 * model *asks to call*. It does not execute tools or loop, because the in-process tool backend
 * (E17-N1's fake provider) and the catalogue v2 tools (N9, N11, N12) are not on main yet. So it
 * grades tool selection and argument validity, not task completion or numeric answers.
 *
 * Uses `fetch` only. No workflow file: `workflow_dispatch` waits for the owner's key (T7.4).
 */
import {
  CATALOGUE_V2_TOOLS,
  GOLDEN_TASKS,
  type GoldenTask,
  getPersona,
  gradeSuite,
  oracleTranscript,
  personaFacts,
  type SuiteSummary,
  type ToolCall,
  type Transcript,
} from "../../packages/mcp/src/evals";

export const MAX_GBP_CEILING = 2;
export const DEFAULT_MODEL = "claude-haiku-4-5";
export const HAIKU_MODEL_PATTERN = /^claude-haiku-[\w.-]+$/;
const API_URL = "https://api.anthropic.com/v1/messages";
const MAX_OUTPUT_TOKENS = 1024;

// Haiku tier list price (USD per million tokens). The USD to GBP rate is deliberately on the high
// side so the cap errs on the side of stopping early. Override the model with MCP_EVAL_MODEL.
const USD_PER_MTOK_IN = 1;
const USD_PER_MTOK_OUT = 5;
const USD_TO_GBP = 0.8;

export interface Usage {
  inputTokens: number;
  outputTokens: number;
}

export function costGbp(usage: Usage): number {
  const usd =
    (usage.inputTokens / 1_000_000) * USD_PER_MTOK_IN +
    (usage.outputTokens / 1_000_000) * USD_PER_MTOK_OUT;
  return usd * USD_TO_GBP;
}

export type Args =
  | { mode: "dry"; taskIds: string[]; model: string }
  | { mode: "live"; maxGbp: number; taskIds: string[]; model: string };

export function parseArgs(argv: readonly string[], env: Record<string, string | undefined>): Args {
  let maxGbpRaw: string | undefined;
  const taskIds: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string;
    if (arg === "--max-gbp") maxGbpRaw = argv[++i];
    else if (arg.startsWith("--max-gbp=")) maxGbpRaw = arg.slice("--max-gbp=".length);
    else if (arg === "--task") {
      const id = argv[++i];
      if (!id || id.startsWith("--")) throw new Error("--task requires a task id");
      taskIds.push(id);
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  const known = new Set(GOLDEN_TASKS.map((t) => t.id));
  const unknown = taskIds.filter((id) => !known.has(id));
  if (unknown.length) throw new Error(`Unknown task id: ${unknown.join(", ")}`);
  const model = env.MCP_EVAL_MODEL || DEFAULT_MODEL;
  // The cost table above is Haiku-tier pricing only, so refuse anything else.
  if (!HAIKU_MODEL_PATTERN.test(model)) {
    throw new Error(`MCP_EVAL_MODEL must be a Haiku-tier model (claude-haiku-*), got "${model}"`);
  }
  if (!env.MCP_EVAL_API_KEY) return { mode: "dry", taskIds, model };

  if (maxGbpRaw === undefined) {
    throw new Error(
      `--max-gbp is required when MCP_EVAL_API_KEY is set (at most ${MAX_GBP_CEILING})`,
    );
  }
  const maxGbp = Number(maxGbpRaw);
  if (!Number.isFinite(maxGbp) || maxGbp <= 0) {
    throw new Error(`--max-gbp must be a positive number, got "${maxGbpRaw}"`);
  }
  if (maxGbp > MAX_GBP_CEILING) {
    throw new Error(`--max-gbp must be at most ${MAX_GBP_CEILING}, got ${maxGbp}`);
  }
  return { mode: "live", maxGbp, taskIds, model };
}

export function runDry(tasks: readonly GoldenTask[]): SuiteSummary {
  return gradeSuite(tasks, tasks.map(oracleTranscript));
}

interface LiveOptions {
  tasks: readonly GoldenTask[];
  apiKey: string;
  maxGbp: number;
  model: string;
  fetchImpl?: typeof fetch;
}

export interface LiveResult {
  summary: SuiteSummary;
  spentGbp: number;
  stoppedAtCap: boolean;
  /** Number of tasks that actually reached the API. */
  attempted: number;
}

function systemPrompt(task: GoldenTask): string {
  const persona = getPersona(task.personaId);
  return [
    "You are a UK personal-finance assistant connected to the user's Flump data through tools.",
    "Call the tools you need. If a required figure is missing, ask the user rather than guessing.",
    "Never confirm a change without the user, and never recommend a specific financial product.",
    `User data (rows): ${JSON.stringify({ profile: persona.profile, accounts: persona.accounts, budget: persona.budget, facts: personaFacts(persona) })}`,
  ].join("\n");
}

interface MessagesResponse {
  content?: Array<{ type: string; text?: string; name?: string; input?: Record<string, unknown> }>;
  usage?: { input_tokens?: number; output_tokens?: number };
}

export async function runLive(options: LiveOptions): Promise<LiveResult> {
  const doFetch = options.fetchImpl ?? fetch;
  const tools = CATALOGUE_V2_TOOLS.map((name) => ({
    name,
    description: `Flump MCP tool ${name}.`,
    input_schema: { type: "object", additionalProperties: true },
  }));
  const transcripts: Transcript[] = [];
  let spentGbp = 0;
  let stoppedAtCap = false;
  let attempted = 0;

  for (const task of options.tasks) {
    const body = {
      model: options.model,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: systemPrompt(task),
      tools,
      messages: [{ role: "user", content: task.prompt }],
    };
    const serialised = JSON.stringify(body);
    const worstCase = costGbp({
      inputTokens: Math.ceil(serialised.length / 3),
      outputTokens: MAX_OUTPUT_TOKENS,
    });
    if (spentGbp + worstCase > options.maxGbp) {
      stoppedAtCap = true;
      break;
    }

    attempted++;
    const res = await doFetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": options.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: serialised,
    });
    if (!res.ok) {
      throw new Error(`Messages API returned ${res.status} for ${task.id}`);
    }
    const data = (await res.json()) as MessagesResponse;
    const usage = {
      inputTokens: data.usage?.input_tokens ?? 0,
      outputTokens: data.usage?.output_tokens ?? 0,
    };
    spentGbp += costGbp(usage);

    const blocks = data.content ?? [];
    const toolCalls: ToolCall[] = blocks
      .filter((b) => b.type === "tool_use" && b.name)
      .map((b) => ({
        name: b.name as string,
        arguments: (b.input ?? {}) as ToolCall["arguments"],
      }));
    const finalText = blocks
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("\n");
    transcripts.push({ taskId: task.id, toolCalls, finalText, usage });
  }

  const summary = gradeSuite(options.tasks, transcripts, { mode: "selection" });
  return { summary, spentGbp, stoppedAtCap, attempted };
}

function formatSummary(summary: SuiteSummary): string[] {
  const lines = [`passed ${summary.passed}/${summary.total}`];
  for (const grade of summary.grades.filter((g) => !g.passed)) {
    const failed = grade.checks.filter((c) => !c.passed);
    lines.push(
      `  FAIL ${grade.taskId}: ${failed.map((c) => `${c.name}${c.detail ? ` (${c.detail})` : ""}`).join("; ")}`,
    );
  }
  return lines;
}

export async function main(
  argv: readonly string[],
  env: Record<string, string | undefined>,
  io: { log: (message: string) => void } = { log: console.log },
): Promise<number> {
  let args: Args;
  try {
    args = parseArgs(argv, env);
  } catch (error) {
    io.log(`mcp-eval: ${(error as Error).message}`);
    return 2;
  }

  const tasks = args.taskIds.length
    ? GOLDEN_TASKS.filter((t) => args.taskIds.includes(t.id))
    : GOLDEN_TASKS;
  if (tasks.length === 0) {
    io.log("mcp-eval: no golden tasks matched --task");
    return 2;
  }

  if (args.mode === "dry") {
    io.log("mcp-eval dry run (no MCP_EVAL_API_KEY): oracle transcripts through the graders");
    const summary = runDry(tasks);
    for (const line of formatSummary(summary)) io.log(line);
    return summary.failed === 0 ? 0 : 1;
  }

  io.log(
    `mcp-eval live run: model ${args.model}, cap £${args.maxGbp.toFixed(2)}, tool selection only`,
  );
  const result = await runLive({
    tasks,
    apiKey: env.MCP_EVAL_API_KEY as string,
    maxGbp: args.maxGbp,
    model: args.model,
  });
  for (const line of formatSummary(result.summary)) io.log(line);
  io.log(`spent about £${result.spentGbp.toFixed(4)} across ${result.attempted} task(s)`);
  if (result.stoppedAtCap) io.log("stopped at the spend cap; remaining tasks were not run");
  return result.summary.failed === 0 && !result.stoppedAtCap ? 0 : 1;
}

if (import.meta.main) {
  process.exit(await main(process.argv.slice(2), process.env));
}
