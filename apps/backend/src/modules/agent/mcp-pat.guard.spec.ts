import type { ExecutionContext } from "@nestjs/common";
import { HttpException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { McpService } from "./mcp.service";
import { McpPatGuard } from "./mcp-pat.guard";

const contextFor = (req: object, res: object) =>
  ({ switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }) }) as ExecutionContext;

const guardWith = (outcome: object) => {
  const authenticateExpress = vi.fn().mockResolvedValue(outcome);
  const service = { getHttpHandler: () => ({ authenticateExpress }) } as unknown as McpService;
  return { guard: new McpPatGuard(service), authenticateExpress };
};

describe("McpPatGuard", () => {
  it("puts the verified token on the request and lets it through", async () => {
    const token = {
      userId: "u1",
      tokenId: "t1",
      scopes: [],
      anonymizeInstitutions: true,
      type: "pat",
    };
    const { guard, authenticateExpress } = guardWith({ ok: true, token });
    const req: { mcpToken?: unknown } = {};
    await expect(guard.canActivate(contextFor(req, {}))).resolves.toBe(true);
    expect(req.mcpToken).toBe(token);
    expect(authenticateExpress).toHaveBeenCalledWith(req);
  });

  it.each([
    [
      401,
      { error: "mcp_auth_error", message: "Not recognised." },
      { "WWW-Authenticate": "Bearer" },
      undefined,
    ],
    [
      429,
      { error: "rate_limit_exceeded", message: "Slow down." },
      { "Retry-After": "12" },
      undefined,
    ],
    [503, { error: "mcp_disabled", message: "Unavailable." }, undefined, "mcp_disabled"],
    [
      403,
      { error: "origin_not_allowed", message: "Origin not allowed." },
      undefined,
      "origin_not_allowed",
    ],
  ])(
    "refuses with the handler's %i, its headers and no token on the request",
    async (status, body, headers, code) => {
      const { guard } = guardWith({ ok: false, status, body, ...(headers ? { headers } : {}) });
      const req: { mcpToken?: unknown } = {};
      const setHeader = vi.fn();
      const err = await guard.canActivate(contextFor(req, { setHeader })).catch((e) => e);
      expect(err).toBeInstanceOf(HttpException);
      expect((err as HttpException).getStatus()).toBe(status);
      const response = (err as HttpException).getResponse() as { error?: string; message: string };
      expect(response.message).toBe(body.message);
      // 401 and 429 take the API's own code for the status; named refusals keep theirs.
      expect(response.error).toBe(code);
      for (const [name, value] of Object.entries(headers ?? {})) {
        expect(setHeader).toHaveBeenCalledWith(name, value);
      }
      expect(req.mcpToken).toBeUndefined();
    },
  );
});
