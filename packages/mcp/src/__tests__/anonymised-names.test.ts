import type { BuildContextPackInput } from "@flump/finance-engine";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { VerifiedToken } from "../auth/token-verifier.js";
import { FLUMP_TOOLS } from "../server.js";
import { connectTestClient, TEST_TOKEN, type TestHarness } from "../testing/client.js";
import { emptyUser } from "../testing/personas.js";
import { MINIMAL_TOOL_ARGS } from "../testing/tool-args.js";

/**
 * Owner ruling 7: for an anonymised token, no budget or tax category or entry name the user typed,
 * and no note, reaches any tool, resource or prompt output. The test walks the whole registry, so a
 * new tool is covered as soon as it is registered (MINIMAL_TOOL_ARGS must name it).
 */

// Names that look like account names, and names that collide with the fixed labels.
const SENTINELS = [
  "Barclays Joint 4471",
  "Mum's loan",
  "Marc Gallagher ISA",
  "Jane's nursery fund",
  "Housing 7",
  "Custom category 9",
  "Flat 2 Example Road",
  "tenant Q Zebedee",
  "Zebedee Consulting",
  "Rental 5",
  // A legacy account type: the stored column is free text, so it must never reach a label or type.
  "Jane's ISA 4471",
  "4471",
];

const budgetEntry = (
  id: string,
  category: string,
  name: string,
  amount: number,
  isIncome = false,
  notes: string | null = null,
) => ({
  id,
  category,
  name,
  amount,
  frequency: "monthly",
  isIncome,
  isEssential: !isIncome,
  notes,
});

const taxRecord = (
  id: string,
  source: "rental" | "self-employed",
  category: string,
  name: string,
  amount: number,
  type: "income" | "expense" = "income",
  notes: string | null = null,
) => ({
  id,
  type,
  source,
  category,
  name,
  amount,
  frequency: "one-off" as const,
  date: "2025-06-01",
  endDate: null,
  notes,
});

const DATA: BuildContextPackInput = {
  ...emptyUser,
  baseline: { ...emptyUser.baseline, annualGrossSalary: 42000, taxYear: "2025/26" },
  accounts: [
    { id: "acc-1", name: "Barclays Joint 4471", type: "Current", balance: 2400 },
    { id: "acc-2", name: "Marc Gallagher ISA", type: "Saving", balance: 9000 },
    { id: "acc-3", name: "Rainy day", type: "Jane's ISA 4471", balance: 500 },
  ],
  budgetEntries: [
    budgetEntry("b1", "bills", "Barclays Joint 4471", 120, false, "Mum's loan"),
    budgetEntry("b2", "bills", "Housing 7", 80),
    budgetEntry("b3", "bills", "Barclays Joint 4471", 30),
    budgetEntry("b4", "Marc Gallagher ISA", "Mum's loan", 200, false, "Jane's nursery fund"),
    budgetEntry("b5", "Custom category 9", "Jane's nursery fund", 150),
    budgetEntry("b6", "housing", "Flat 2 Example Road", 900),
    budgetEntry("b7", "Zebedee Consulting", "Zebedee Consulting", 3100, true),
  ],
  taxRecords: [
    taxRecord(
      "t1",
      "rental",
      "rental_income",
      "Flat 2 Example Road",
      900,
      "income",
      "tenant Q Zebedee",
    ),
    taxRecord("t2", "rental", "Custom category 9", "Rental 5", 120, "expense", "Mum's loan"),
    taxRecord("t3", "self-employed", "self_employed_income", "Zebedee Consulting", 5000),
    taxRecord("t4", "rental", "repairs_maintenance", "Flat 2 Example Road", 300, "expense"),
  ],
};

const FULL_TOKEN: VerifiedToken = {
  ...TEST_TOKEN,
  scopes: ["mcp:read:full", "mcp:simulate", "write:stage"],
  anonymizeInstitutions: false,
};

/** The calls each tool gets: its minimal arguments, plus detailed and alternative groupings. */
function callsFor(name: string): Array<Record<string, unknown>> {
  const base = MINIMAL_TOOL_ARGS[name] ?? {};
  const calls = [base, { ...base, responseFormat: "detailed" }];
  if (name === "list_tax_records") {
    calls.push({ ...base, groupBy: "month", responseFormat: "detailed" });
  }
  return calls;
}

/**
 * Calls a tool and fails unless it succeeded with a defined, non-empty result, so two error
 * responses (or two empty results) can never compare equal and pass a table test.
 */
async function callOk(
  harness: TestHarness,
  name: string,
  args: Record<string, unknown>,
): Promise<{ text: string; result: unknown }> {
  const label = `${name} ${JSON.stringify(args)}`;
  const res = await harness.client.callTool({ name, arguments: args });
  const content = res.content as Array<{ type: string; text?: string }>;
  const text = content[0]?.text ?? "";
  expect(res.isError, `${label}: ${text}`).not.toBe(true);
  expect(text.length, label).toBeGreaterThan(0);
  const result = (JSON.parse(text) as { result?: unknown }).result;
  expect(result, label).toBeDefined();
  expect(result, label).not.toBeNull();
  if (Array.isArray(result)) expect(result.length, label).toBeGreaterThan(0);
  else if (typeof result === "object")
    expect(Object.keys(result as object).length, label).toBeGreaterThan(0);
  return { text, result };
}

/** Every number in a JSON tree, in order. */
function numbers(value: unknown, out: number[] = []): number[] {
  if (typeof value === "number") out.push(value);
  else if (Array.isArray(value)) for (const v of value) numbers(v, out);
  else if (value && typeof value === "object")
    for (const v of Object.values(value)) numbers(v, out);
  return out;
}

describe("ruling 7: anonymised tokens never see typed budget or tax names", () => {
  let anon: TestHarness;
  let full: TestHarness;
  beforeAll(async () => {
    anon = await connectTestClient(DATA);
    full = await connectTestClient(DATA, { token: FULL_TOKEN });
  });
  afterAll(async () => {
    await anon.close();
    await full.close();
  });

  it("covers every registered tool", async () => {
    const { tools } = await anon.client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(FLUMP_TOOLS.map((t) => t.name).sort());
    for (const t of FLUMP_TOOLS) expect(MINIMAL_TOOL_ARGS[t.name], t.name).toBeDefined();
  });

  it.each(FLUMP_TOOLS.map((t) => t.name))("%s leaves no sentinel in its output", async (name) => {
    for (const args of callsFor(name)) {
      const { text } = await callOk(anon, name, args);
      for (const sentinel of SENTINELS) {
        expect(text, `${name} ${JSON.stringify(args)}: ${sentinel}`).not.toContain(sentinel);
      }
    }
  });

  it.each(FLUMP_TOOLS.map((t) => t.name))(
    "%s keeps every figure the full read gives",
    async (name) => {
      // stage_import's batch id and timestamps differ per call, so only the read and simulate
      // tools are compared figure by figure.
      if (name === "stage_import" || name === "get_import_status") return;
      for (const args of callsFor(name)) {
        const a = await callOk(anon, name, args);
        const f = await callOk(full, name, args);
        expect(numbers(a.result), `${name} ${JSON.stringify(args)}`).toEqual(numbers(f.result));
      }
    },
  );

  it("leaves no sentinel in any resource or prompt", async () => {
    const { resources } = await anon.client.listResources();
    for (const r of resources) {
      const text = JSON.stringify(await anon.client.readResource({ uri: r.uri }));
      for (const sentinel of SENTINELS)
        expect(text, `${r.uri}: ${sentinel}`).not.toContain(sentinel);
    }
    const { prompts } = await anon.client.listPrompts();
    for (const p of prompts) {
      const text = JSON.stringify(await anon.client.getPrompt({ name: p.name, arguments: {} }));
      for (const sentinel of SENTINELS)
        expect(text, `${p.name}: ${sentinel}`).not.toContain(sentinel);
    }
  });

  it("labels budget entries and categories by fixed group", async () => {
    const e = (await anon.callJson("get_budget_summary", { responseFormat: "detailed" })) as {
      result: { entries: Array<{ name: string; category: string; monthlyGbp: number }> };
    };
    expect(e.result.entries.map((x) => [x.name, x.category, x.monthlyGbp])).toEqual([
      ["Bills 1", "bills", 120],
      ["Bills 2", "bills", 80],
      ["Bills 1", "bills", 30],
      ["Entry 1", "Custom category 1", 200],
      ["Entry 2", "Custom category 2", 150],
      ["Housing 1", "housing", 900],
      ["Income 1", "Custom category 3", 3100],
    ]);
  });

  it("labels tax records by source", async () => {
    const e = (await anon.callJson("list_tax_records", {
      taxYear: "2025/26",
      responseFormat: "detailed",
    })) as { result: { rows: Array<{ name: string; category: string; amountGbp: number }> } };
    expect(e.result.rows.map((r) => [r.name, r.category, r.amountGbp]).sort()).toEqual(
      [
        ["Rental 1", "rental_income", 900],
        ["Rental 2", "other", 120],
        ["Self-employed 1", "self_employed_income", 5000],
        ["Rental 1", "repairs_maintenance", 300],
      ].sort(),
    );
  });

  it("shows the real names to a token that is not anonymised", async () => {
    const budget = await full.callText("get_budget_summary", { responseFormat: "detailed" });
    const tax = await full.callText("list_tax_records", {
      taxYear: "2025/26",
      responseFormat: "detailed",
    });
    expect(budget).toContain("Barclays Joint 4471");
    expect(budget).toContain("Mum's loan");
    expect(budget).toContain("Marc Gallagher ISA");
    expect(tax).toContain("Flat 2 Example Road");
    expect(tax).toContain("Zebedee Consulting");
  });
});
