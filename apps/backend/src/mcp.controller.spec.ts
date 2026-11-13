import { BadRequestException, ParseUUIDPipe } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AuthGuard } from "./auth/auth.guard";
import { McpController } from "./mcp.controller";
import type { McpService } from "./mcp.service";
import { McpAllowlistGuard, McpKillSwitchGuard } from "./mcp-access";

describe("McpController", () => {
  const mockMcpService = {
    getHttpHandler: vi.fn().mockReturnValue({
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

  it("surfaces the service's BadRequestException as a 400", async () => {
    vi.mocked(mockMcpService.createPatToken).mockRejectedValueOnce(
      new BadRequestException("Token expiry must be one of 7, 30, 90, 365 days."),
    );
    const err = await controller
      .createToken({ user: { id: "u_1" } }, { name: "x", expiryDays: null })
      .catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getStatus()).toBe(400);
  });

  it("revokes an active token", async () => {
    const res = await controller.revokeToken({ user: { id: "u_1" } }, "tok_1");
    expect(res.success).toBe(true);
  });

  it("exports the offline context pack", async () => {
    const res = await controller.getContextPack({ user: { id: "u_1" } }, "true");
    expect(res.markdown).toBeDefined();
  });

  describe("guard wiring (E29-T8)", () => {
    const guardsOf = (method: keyof McpController) =>
      Reflect.getMetadata("__guards__", McpController.prototype[method]) as unknown[];

    it("gates token creation and the context pack in order: kill switch, auth, allowlist", () => {
      const expected = [McpKillSwitchGuard, AuthGuard, McpAllowlistGuard];
      expect(guardsOf("createToken")).toEqual(expected);
      expect(guardsOf("getContextPack")).toEqual(expected);
    });

    it("puts the kill switch on both /mcp handlers, with no allowlist guard (the handler owns auth)", () => {
      for (const method of ["handleMcpPost", "handleMcpGet"] as const) {
        expect(guardsOf(method)).toEqual([McpKillSwitchGuard]);
      }
    });

    it("leaves list and revoke without the allowlist so users can always revoke", () => {
      for (const method of ["listTokens", "revokeToken"] as const) {
        const guards = guardsOf(method);
        expect(guards).toEqual([AuthGuard]);
        expect(guards).not.toContain(McpAllowlistGuard);
        expect(guards).not.toContain(McpKillSwitchGuard);
      }
    });
  });

  it("the revoke route validates its id as a UUID", () => {
    const params = Reflect.getMetadata(
      "__routeArguments__",
      McpController,
      "revokeToken",
    ) as Record<string, { data: string; pipes: unknown[] }>;
    const idArg = Object.values(params).find((a) => a.data === "id");
    expect(idArg?.pipes.some((p) => p instanceof ParseUUIDPipe)).toBe(true);
  });
});
