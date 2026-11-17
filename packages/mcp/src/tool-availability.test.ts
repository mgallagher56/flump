import { afterEach, describe, expect, it } from "vitest";
import { FLUMP_TOOLS } from "./server.js";
import { connectTestClient, TEST_TOKEN, type TestHarness } from "./testing/client.js";
import { emptyUser } from "./testing/personas.js";

const HIDDEN = new Set(["get_retirement_picture", "simulate_retirement"]);
const FULL = { ...TEST_TOKEN, scopes: ["mcp:read:full", "mcp:simulate"] as never };

const callText = async (h: TestHarness, name: string) => {
  const res = await h.client.callTool({ name, arguments: {} });
  const content = res.content as Array<{ text?: string }>;
  return { isError: res.isError === true, text: content[0]?.text ?? "" };
};

const schemaTools = async (h: TestHarness) => {
  const res = await h.client.readResource({ uri: "flump://schema" });
  const doc = JSON.parse((res.contents[0] as { text: string }).text) as {
    tools: Record<string, string>;
  };
  return Object.keys(doc.tools).sort();
};

describe("isToolAvailable: the host hides tools per caller", () => {
  let h: TestHarness | undefined;
  afterEach(async () => {
    await h?.close();
    h = undefined;
  });

  it("keeps every tool when the option is absent", async () => {
    h = await connectTestClient(emptyUser, { token: FULL });
    const names = (await h.client.listTools()).tools.map((t) => t.name).sort();
    expect(names).toEqual(FLUMP_TOOLS.map((t) => t.name).sort());
    expect(await schemaTools(h)).toEqual(names);
  });

  it("leaves rejected tools out of tools/list and the schema resource", async () => {
    h = await connectTestClient(emptyUser, {
      token: FULL,
      isToolAvailable: (name) => !HIDDEN.has(name),
    });
    const names = (await h.client.listTools()).tools.map((t) => t.name).sort();
    expect(names).toEqual(
      FLUMP_TOOLS.map((t) => t.name)
        .filter((n) => !HIDDEN.has(n))
        .sort(),
    );
    expect(await schemaTools(h)).toEqual(names);
    const schemaText = JSON.stringify(
      (await h.client.readResource({ uri: "flump://schema" })).contents,
    );
    expect(schemaText).not.toMatch(/retirement/i);
  });

  it("answers a call to a hidden tool exactly as a call to a tool that does not exist", async () => {
    h = await connectTestClient(emptyUser, {
      token: FULL,
      isToolAvailable: (name) => !HIDDEN.has(name),
    });
    const unknown = await callText(h, "no_such_tool");
    expect(unknown.isError).toBe(true);
    for (const name of HIDDEN) {
      const hidden = await callText(h, name);
      expect(hidden.isError).toBe(true);
      expect(hidden.text.replace(name, "X")).toBe(unknown.text.replace("no_such_tool", "X"));
    }
  });
});
