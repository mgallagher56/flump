import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectTestClient, type TestHarness } from "../testing/client.js";
import { renterWithUnknownAprCard } from "../testing/personas.js";
import { MINIMAL_TOOL_ARGS } from "../testing/tool-args.js";

const TOOL_ARGS = MINIMAL_TOOL_ARGS;

/** E17-N3: summaries only, compact JSON, SDK registration, real version. */
describe("MCP output size and registration (E17-N3)", () => {
  let h: TestHarness;
  beforeAll(async () => {
    h = await connectTestClient(renterWithUnknownAprCard);
  });
  afterAll(async () => {
    await h.close();
  });

  it("compare returns one summary per strategy and no per-debt schedule", async () => {
    const text = await h.callText("simulate_debt_payoff", {
      strategy: "compare",
      debts: [],
    });
    expect(text).not.toContain("monthlySchedule");
    expect(text).not.toContain('"payments":[');
  });

  it("every resource and tool output is compact JSON", async () => {
    const { resources } = await h.client.listResources();
    for (const r of resources) {
      const res = await h.client.readResource({ uri: r.uri });
      expect((res.contents[0] as { text: string }).text, r.uri).not.toContain("\n");
    }
    const { tools } = await h.client.listTools();
    for (const tool of tools) {
      const args = TOOL_ARGS[tool.name];
      expect(args, `no minimal args for tool ${tool.name}; add it to TOOL_ARGS`).toBeDefined();
      expect(await h.callText(tool.name, args), tool.name).not.toContain("\n");
    }
  });

  it("registers exactly the expected resources", async () => {
    const { resources } = await h.client.listResources();
    expect(resources.map((r) => [r.name, r.uri])).toEqual([["schema", "flump://schema"]]);
  });

  it("gives tools distinct titles", async () => {
    const { tools } = await h.client.listTools();
    const titles = tools.map((t) => t.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("gives every tool and resource a title", async () => {
    const { tools } = await h.client.listTools();
    const { resources } = await h.client.listResources();
    for (const item of [...tools, ...resources]) {
      expect(item.title, item.name).toBeTruthy();
    }
  });

  it("reports the package.json version as the server version", () => {
    const pkg = JSON.parse(
      readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
    ) as { version: string };
    expect(h.client.getServerVersion()?.version).toBe(pkg.version);
  });
});
