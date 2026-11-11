import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthGuard } from "./auth.guard";

describe("AuthGuard", () => {
  let guard: AuthGuard;
  let configService: ConfigService;

  beforeEach(() => {
    configService = {
      get: vi.fn(),
    } as unknown as ConfigService;
    guard = new AuthGuard(configService);
  });

  const createMockContext = (request: any): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as ExecutionContext;

  it("bypasses authentication for OAuth callback path", async () => {
    const request = { path: "/bank-connections/callback", headers: {} };
    const context = createMockContext(request);

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it("throws UnauthorizedException if authorization header is missing or does not start with Bearer", async () => {
    const requestNoHeader = { path: "/finance", headers: {} };
    await expect(guard.canActivate(createMockContext(requestNoHeader))).rejects.toThrow(
      UnauthorizedException,
    );

    const requestBadHeader = { path: "/finance", headers: { authorization: "Basic 123" } };
    await expect(guard.canActivate(createMockContext(requestBadHeader))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("authenticates mock-session-token", async () => {
    const request = {
      path: "/finance",
      headers: { authorization: "Bearer mock-session-token" },
    };
    const context = createMockContext(request);

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it("authenticates valid JWT token with sub and email", async () => {
    const payload = { sub: "user_jwt_123", email: "test@flump.co.uk" };
    const b64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
    const jwt = `header.${b64Payload}.signature`;

    const request = {
      path: "/finance",
      headers: { authorization: `Bearer ${jwt}` },
    };
    const context = createMockContext(request);

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it("authenticates valid JWT token with id instead of sub", async () => {
    const payload = { id: "user_jwt_456" };
    const b64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
    const jwt = `header.${b64Payload}.signature`;

    const request = {
      path: "/finance",
      headers: { authorization: `Bearer ${jwt}` },
    };
    const context = createMockContext(request);

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it("falls back to dev user when token is invalid and no WORKOS_API_KEY is configured", async () => {
    vi.spyOn(configService, "get").mockReturnValue(undefined);

    const request = {
      path: "/finance",
      headers: { authorization: "Bearer invalid.jwt" },
    };
    const context = createMockContext(request);

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it("throws UnauthorizedException when token is invalid and WORKOS_API_KEY is configured", async () => {
    vi.spyOn(configService, "get").mockReturnValue("sk_live_12345");

    const request = {
      path: "/finance",
      headers: { authorization: "Bearer invalid.jwt" },
    };
    const context = createMockContext(request);

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });
});
