import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectTestClient, detectDefaultLeaks, type TestHarness } from "../testing/client.js";
import { emptyUser, mortgageAndIsa, renterWithUnknownAprCard } from "../testing/personas.js";
import { MINIMAL_TOOL_ARGS } from "../testing/tool-args.js";

/**
 * Pins today's MCP surface (tools/list, resources/list, prompts/list) and each tool's
 * output size. Later tickets (N3 to N5, N8 to N14) change these deliberately and update
 * the snapshot in the same PR.
 */
describe("MCP surface snapshot (E17-N1)", () => {
  let h: TestHarness;
  beforeAll(async () => {
    h = await connectTestClient(mortgageAndIsa);
  });
  afterAll(async () => {
    await h.close();
  });

  it("pins tools/list", async () => {
    const { tools } = await h.client.listTools();
    expect(tools.map((t) => t.name).sort()).toMatchSnapshot("tool names");
    expect(tools).toMatchSnapshot("tools/list");
  });

  it("pins resources/list", async () => {
    const { resources } = await h.client.listResources();
    expect(resources).toMatchSnapshot();
  });

  it("registers no prompts (2026-11 re-plan PR A; PR D adds two)", () => {
    expect(h.client.getServerCapabilities()?.prompts).toBeUndefined();
  });
});

const TOOL_CALLS = MINIMAL_TOOL_ARGS;

describe("per-tool output size (E17-N1)", () => {
  it("calls every registered tool and pins the output size in bytes", async () => {
    const h = await connectTestClient(renterWithUnknownAprCard);
    try {
      const { tools } = await h.client.listTools();
      expect(Object.keys(TOOL_CALLS).sort()).toEqual(tools.map((t) => t.name).sort());

      const sizes: Record<string, number> = {};
      for (const [name, args] of Object.entries(TOOL_CALLS)) {
        sizes[name] = Buffer.byteLength(await h.callText(name, args), "utf8");
      }
      // Rounded up to the nearest 500 bytes so trivial formatting changes do not churn it.
      const rounded = Object.fromEntries(
        Object.entries(sizes).map(([k, v]) => [k, Math.ceil(v / 500) * 500]),
      );
      expect(rounded).toMatchSnapshot();
    } finally {
      await h.close();
    }
  });
});

describe("default-leak table (E17-N1)", () => {
  /**
   * Which silent defaults leak into each tool's output for a user with no data. This table
   * shrinks as later tickets land; delete a value from a row when its default is removed.
   *
   * E17-N5: every default is now also disclosed in the response `assumptions[]`, which is why the
   * values below appear as echoed JSON values. They disappear when later tickets remove the defaults.
   *
   * This table covers ECHOED values only. E17-N11 removed the tools that substituted silent defaults, so every row
   * is now empty. 45000 belongs to N2.
   */
  const EXPECTED_LEAKS_FOR_EMPTY_USER: Record<string, Array<number | string>> = Object.fromEntries(
    Object.keys(MINIMAL_TOOL_ARGS).map((name) => [name, []]),
  );

  it("detects defaults for an empty user", async () => {
    const h = await connectTestClient(emptyUser);
    try {
      const leaks: Record<string, Array<number | string>> = {};
      for (const [name, args] of Object.entries(TOOL_CALLS)) {
        leaks[name] = detectDefaultLeaks(JSON.parse(await h.callText(name, args)));
      }
      expect(leaks).toEqual(EXPECTED_LEAKS_FOR_EMPTY_USER);
    } finally {
      await h.close();
    }
  });

  it("detectDefaultLeaks only reports values present as JSON values", () => {
    expect(detectDefaultLeaks({ a: 45000, b: [19.9], c: { d: "PLAN_2" } })).toEqual([
      45000,
      19.9,
      "PLAN_2",
    ]);
    expect(detectDefaultLeaks({ plan: "plan2" })).toEqual(["PLAN_2"]);
    expect(detectDefaultLeaks({ a: 1 })).toEqual([]);
  });
});
