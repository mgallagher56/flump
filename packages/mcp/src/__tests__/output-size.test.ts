import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectTestClient, type TestHarness } from "../testing/client.js";
import { renterWithUnknownAprCard } from "../testing/personas.js";

/** E17-N3: summaries only, compact JSON, SDK registration, real version. */
describe("MCP output size and registration (E17-N3)", () => {
  let h: TestHarness;
  beforeAll(async () => {
    h = await connectTestClient(renterWithUnknownAprCard);
  });
  afterAll(async () => {
    await h.close();
  });

  it("COMPARE_BOTH returns summaries without monthlySchedule", async () => {
    const text = await h.callText("simulate_debt_payoff", { strategy: "COMPARE_BOTH" });
    expect(text).not.toContain("monthlySchedule");
    const out = JSON.parse(text) as {
      comparison: Record<string, { months: number; totalInterest: number }>;
    };
    for (const key of ["avalanche", "snowball", "minimumOnly"]) {
      expect(out.comparison[key]?.months).toBeGreaterThan(0);
      expect(out.comparison[key]?.totalInterest).toBeGreaterThanOrEqual(0);
    }
  });

  it("executive-snapshot drops monthlySchedule and is compact", async () => {
    const res = await h.client.readResource({ uri: "flump://context/executive-snapshot" });
    const text = (res.contents[0] as { text: string }).text;
    expect(text).not.toContain("monthlySchedule");
    expect(JSON.parse(text).debtSummary.avalancheVsSnowballComparison.avalanche.months).toBeTypeOf(
      "number",
    );
    expect(text).not.toContain("\n");
  });

  it("every resource and tool output is compact JSON", async () => {
    const { resources } = await h.client.listResources();
    for (const r of resources) {
      const res = await h.client.readResource({ uri: r.uri });
      expect((res.contents[0] as { text: string }).text, r.uri).not.toContain("\n");
    }
    for (const [name, args] of [
      ["simulate_debt_payoff", { strategy: "AVALANCHE" }],
      ["evaluate_cashflow_runway_and_health", {}],
    ] as const) {
      expect(await h.callText(name, args), name).not.toContain("\n");
    }
  });

  it("gives every tool, resource and prompt a title", async () => {
    const { tools } = await h.client.listTools();
    const { resources } = await h.client.listResources();
    const { prompts } = await h.client.listPrompts();
    for (const item of [...tools, ...resources, ...prompts]) {
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
