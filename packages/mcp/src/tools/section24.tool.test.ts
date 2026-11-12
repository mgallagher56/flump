import { describe, expect, it } from "vitest";
import { registerSection24Tool } from "./section24.tool.js";

type Handler = (args: Record<string, unknown>) => Promise<{
  isError?: boolean;
  content: { text: string }[];
}>;

function captureHandler(): Handler {
  let handler: Handler | undefined;
  const server = {
    registerTool: (_name: string, _cfg: unknown, h: Handler) => {
      handler = h;
    },
  };
  registerSection24Tool(server as never, async () => {
    throw new Error("context must not be read for an unsupported year");
  });
  return handler as Handler;
}

describe("section24 tool tax year validation (E22)", () => {
  it("returns a tool error for an unsupported year instead of throwing or guessing", async () => {
    const res = await captureHandler()({ taxYear: "2019/20", ownershipSharePct: 100 });
    expect(res.isError).toBe(true);
    const body = JSON.parse(res.content[0]?.text ?? "{}");
    expect(body.error).toBe("UNSUPPORTED_TAX_YEAR");
    expect(body.message).toContain("2026/27");
  });
});
