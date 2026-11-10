import { describe, expect, it, vi } from "vitest";
import { McpController } from "./mcp.controller";
import type { McpService } from "./mcp.service";

describe("McpController", () => {
  const mockMcpService = {
    getHttpHandler: vi.fn().mockReturnValue({
      getOAuthMetadata: vi.fn().mockReturnValue({
        resource: "https://mcp.flump.co.uk",
        scopes_supported: ["mcp:read:anonymized", "mcp:simulate"],
      }),
      handleExpressRequest: vi.fn().mockResolvedValue(undefined),
    }),
    listTokens: vi.fn().mockResolvedValue([
      {
        id: "tok_1",
        name: "Claude Desktop",
        tokenPrefix: "flump_pat_ab12...ef34",
        isRevoked: false,
        totalToolCalls: 5,
      },
    ]),
    createPatToken: vi.fn().mockResolvedValue({
      id: "tok_2",
      name: "Cursor AI",
      rawToken: "flump_pat_abcdef1234567890abcdef1234567890",
      tokenPrefix: "flump_pat_abcd...7890",
    }),
    revokeToken: vi.fn().mockResolvedValue({ success: true }),
    getContextPack: vi.fn().mockResolvedValue({
      pack: { metadata: { isAnonymized: true } },
      markdown: "# Flump Context Pack",
    }),
  } as unknown as McpService;

  const controller = new McpController(mockMcpService);

  it("serves OAuth protected resource metadata", () => {
    const meta = controller.getOAuthMetadata();
    expect(meta.resource).toBe("https://mcp.flump.co.uk");
  });

  it("lists active AI connection tokens", async () => {
    const tokens = await controller.listTokens({ user: { id: "u_1" } });
    expect(tokens).toHaveLength(1);
    expect(tokens[0]?.name).toBe("Claude Desktop");
  });

  it("creates a new PAT token", async () => {
    const res = await controller.createToken(
      { user: { id: "u_1" } },
      { name: "Cursor AI", expiryDays: 90, anonymizeInstitutions: true },
    );
    expect(res.rawToken).toBeDefined();
    expect(res.name).toBe("Cursor AI");
  });

  it("revokes an active token", async () => {
    const res = await controller.revokeToken({ user: { id: "u_1" } }, "tok_1");
    expect(res.success).toBe(true);
  });

  it("exports the offline context pack", async () => {
    const res = await controller.getContextPack({ user: { id: "u_1" } }, "true");
    expect(res.markdown).toBeDefined();
  });
});
