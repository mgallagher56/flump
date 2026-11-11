import { beforeEach, describe, expect, it, vi } from "vitest";

const handlerOptions: any[] = [];

vi.mock("@flump/mcp", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@flump/mcp")>();
  return {
    ...actual,
    HttpMcpHandler: class {
      constructor(options: unknown) {
        handlerOptions.push(options);
      }
    },
  };
});

import { DEV_BYPASS_TOKEN, DEV_USER } from "./auth/dev-bypass.verifier";
import { McpService } from "./mcp.service";

function build(mode: "workos" | "dev") {
  const config = { get: vi.fn().mockReturnValue(undefined) };
  const nothing = {} as never;
  return new McpService(
    nothing,
    nothing,
    nothing,
    nothing,
    nothing,
    nothing,
    nothing,
    nothing,
    nothing,
    config as never,
    mode,
  );
}

describe("McpService dev token wiring", () => {
  beforeEach(() => {
    handlerOptions.length = 0;
  });

  it("passes the dev token and user only in dev mode", () => {
    build("dev");
    expect(handlerOptions[0].devToken).toBe(DEV_BYPASS_TOKEN);
    expect(handlerOptions[0].devUserId).toBe(DEV_USER.id);
  });

  it("passes no dev options in workos mode", () => {
    build("workos");
    expect(handlerOptions[0].devToken).toBeUndefined();
    expect(handlerOptions[0].devUserId).toBeUndefined();
  });
});
