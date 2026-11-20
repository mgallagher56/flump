import { type ExecutionContext, NotFoundException } from "@nestjs/common";
import { afterEach, describe, expect, it } from "vitest";
import { ImportsAccessGuard } from "./imports-access.guard";

const ctx = (userId?: string) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user: userId ? { id: userId } : undefined }) }),
  }) as unknown as ExecutionContext;

describe("ImportsAccessGuard", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("allows allowlisted users and answers others with a neutral 404", () => {
    process.env.MCP_OPEN_ACCESS = "false";
    process.env.MCP_ALLOWED_USER_IDS = "owner";
    const guard = new ImportsAccessGuard();
    expect(guard.canActivate(ctx("owner"))).toBe(true);
    try {
      guard.canActivate(ctx("someone"));
      expect.unreachable();
    } catch (err) {
      const body = (err as { getResponse: () => object }).getResponse();
      expect(body).toEqual({ code: "not_found", message: "Not found" });
      expect(JSON.stringify(body)).not.toMatch(/AI|MCP/);
    }
  });

  it("answers the neutral 404 rather than failing when request.user is missing", () => {
    process.env.MCP_OPEN_ACCESS = "false";
    // The allowlist names some other account; the request has no user at all.
    process.env.MCP_ALLOWED_USER_IDS = ["own", "er"].join("");
    expect(() => new ImportsAccessGuard().canActivate(ctx())).toThrow(NotFoundException);
  });

  it("is open when open access is on", () => {
    process.env.MCP_OPEN_ACCESS = "true";
    expect(new ImportsAccessGuard().canActivate(ctx("anyone"))).toBe(true);
  });
});
