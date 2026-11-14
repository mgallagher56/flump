import { BadRequestException, ParseUUIDPipe } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { encodeActivityCursor } from "./agent/agent-audit.service";
import type { McpTokenService } from "./agent/mcp-token.service";
import { AuthGuard } from "./auth/auth.guard";
import { McpController } from "./mcp.controller";
import type { McpService } from "./mcp.service";
import { McpAllowlistGuard, McpKillSwitchGuard } from "./mcp-access";

describe("McpController", () => {
  const mockMcpService = {
    getHttpHandler: vi.fn().mockReturnValue({
      handleExpressRequest: vi.fn().mockResolvedValue(undefined),
    }),
    getContextPack: vi.fn().mockResolvedValue({
      pack: { metadata: { isAnonymized: true } },
      markdown: "# Flump Context Pack",
    }),
  } as unknown as McpService;

  const mockTokenService = {
    listTokensPage: vi.fn().mockResolvedValue({
      items: [
        {
          id: "tok_1",
          name: "Claude Desktop",
          tokenPrefix: ["flump", "pat", "ab12...ef34"].join("_"),
          isRevoked: false,
          totalToolCalls: 5,
        },
      ],
      nextCursor: "next-page-cursor",
    }),
    createPatToken: vi.fn().mockResolvedValue({
      id: "tok_2",
      name: "Cursor AI",
      rawToken: "flump_pat_abcdef1234567890abcdef1234567890",
      tokenPrefix: "flump_pat_abcd...7890",
    }),
    revokeToken: vi.fn().mockResolvedValue({ success: true }),
  } as unknown as McpTokenService;

  const mockAudit = {
    listForToken: vi.fn().mockResolvedValue({ events: [], nextBefore: null }),
  };
  const controller = new McpController(mockMcpService, mockTokenService, mockAudit as never);
  const TOKEN_ID = "00000000-0000-4000-8000-000000000001";

  it("passes allowStaging through to the token service (default left to the service)", async () => {
    await controller.createToken({ user: { id: "u_1" } }, { name: "Stager", allowStaging: true });
    expect(mockTokenService.createPatToken).toHaveBeenLastCalledWith("u_1", "Stager", {
      expiryDays: undefined,
      anonymizeInstitutions: undefined,
      allowStaging: true,
    });
  });

  it("activity: returns the owner's page with the parsed limit and cursor", async () => {
    (mockTokenService as unknown as { ownsToken: unknown }).ownsToken = vi
      .fn()
      .mockResolvedValue(true);
    await controller.getActivity({ user: { id: "u_1" } }, TOKEN_ID, {
      limit: "10",
      before: encodeActivityCursor(TOKEN_ID),
    });
    expect(mockAudit.listForToken).toHaveBeenLastCalledWith("u_1", TOKEN_ID, {
      limit: 10,
      before: encodeActivityCursor(TOKEN_ID),
    });
  });

  it("activity: another user's token is a 404 and reads nothing", async () => {
    (mockTokenService as unknown as { ownsToken: unknown }).ownsToken = vi
      .fn()
      .mockResolvedValue(false);
    mockAudit.listForToken.mockClear();
    await expect(controller.getActivity({ user: { id: "u_2" } }, TOKEN_ID, {})).rejects.toThrow(
      "not found",
    );
    expect(mockAudit.listForToken).not.toHaveBeenCalled();
  });

  it("activity: rejects a limit over 500 or a bad cursor with 400", async () => {
    for (const query of [
      { limit: "501" },
      { limit: "0" },
      { before: "yesterday" },
      { before: "bm90LWEtdXVpZA" },
    ]) {
      await expect(
        controller.getActivity({ user: { id: "u_1" } }, TOKEN_ID, query),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it("activity: session auth only, with a UUID param", () => {
    const guards = Reflect.getMetadata("__guards__", McpController.prototype.getActivity);
    expect(guards).toEqual([AuthGuard]);
  });

  it("lists active AI connection tokens", async () => {
    const res = { setHeader: vi.fn() };
    const tokens = await controller.listTokens(
      { user: { id: "u_1" } },
      { limit: "10" },
      res as never,
    );
    expect(tokens).toHaveLength(1);
    expect(tokens[0]?.name).toBe("Claude Desktop");
    expect(mockTokenService.listTokensPage).toHaveBeenLastCalledWith("u_1", { limit: 10 });
    expect(res.setHeader).toHaveBeenCalledWith("X-Next-Cursor", "next-page-cursor");
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
    vi.mocked(mockTokenService.createPatToken).mockRejectedValueOnce(
      new BadRequestException("Token expiry must be one of 7, 30, 90, 365 days."),
    );
    const err = await controller
      .createToken({ user: { id: "u_1" } }, { name: "x", expiryDays: null } as never)
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
