import {
  type ExecutionContext,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { describe, expect, it } from "vitest";
import {
  isMcpUserAllowed,
  McpAllowlistGuard,
  McpKillSwitchGuard,
  mcpOpenAccessBootWarning,
  readMcpAccessConfig,
} from "./mcp-access";

const ctx = (user?: { id: string }) =>
  ({ switchToHttp: () => ({ getRequest: () => ({ user }) }) }) as unknown as ExecutionContext;

describe("readMcpAccessConfig", () => {
  it("parses the allowlist and trims blanks", () => {
    const c = readMcpAccessConfig({ MCP_ALLOWED_USER_IDS: " a, b ,,c " });
    expect(c.allowedUserIds).toEqual(["a", "b", "c"]);
  });

  it("kill switch is on unless MCP_ENABLED is false", () => {
    expect(readMcpAccessConfig({}).enabled).toBe(true);
    expect(readMcpAccessConfig({ MCP_ENABLED: "FALSE" }).enabled).toBe(false);
  });

  it("open access defaults off in production and on elsewhere", () => {
    expect(readMcpAccessConfig({ NODE_ENV: "production" }).openAccess).toBe(false);
    expect(readMcpAccessConfig({ NODE_ENV: "development" }).openAccess).toBe(true);
    expect(
      readMcpAccessConfig({ NODE_ENV: "production", MCP_OPEN_ACCESS: "true" }).openAccess,
    ).toBe(true);
    expect(readMcpAccessConfig({ NODE_ENV: "test", MCP_OPEN_ACCESS: "false" }).openAccess).toBe(
      false,
    );
  });
});

describe("fail-closed default and boot warning", () => {
  it("is closed by default on Railway even without NODE_ENV=production", () => {
    expect(readMcpAccessConfig({ RAILWAY_ENVIRONMENT: "production" }).openAccess).toBe(false);
    expect(
      readMcpAccessConfig({ RAILWAY_ENVIRONMENT: "production", MCP_OPEN_ACCESS: "true" })
        .openAccess,
    ).toBe(true);
  });

  it("warns only when open by default without an explicit flag", () => {
    expect(mcpOpenAccessBootWarning({ NODE_ENV: "development" })).toMatch(/MCP_OPEN_ACCESS/);
    expect(
      mcpOpenAccessBootWarning({ NODE_ENV: "development", MCP_OPEN_ACCESS: "true" }),
    ).toBeNull();
    expect(mcpOpenAccessBootWarning({ NODE_ENV: "production" })).toBeNull();
  });
});

describe("isMcpUserAllowed", () => {
  const prod = readMcpAccessConfig({ NODE_ENV: "production", MCP_ALLOWED_USER_IDS: "owner" });
  it("allows allowlisted users only in production", () => {
    expect(isMcpUserAllowed(prod, "owner")).toBe(true);
    expect(isMcpUserAllowed(prod, "friend")).toBe(false);
    expect(isMcpUserAllowed(prod, undefined)).toBe(false);
  });
  it("allows everyone when open", () => {
    expect(isMcpUserAllowed(readMcpAccessConfig({ MCP_OPEN_ACCESS: "true" }), "friend")).toBe(true);
  });
});

describe("guards", () => {
  const original = process.env;
  const set = (env: Record<string, string>) => {
    process.env = { ...original, ...env } as NodeJS.ProcessEnv;
  };

  it("kill switch answers 503 when MCP_ENABLED=false", () => {
    set({ MCP_ENABLED: "false" });
    try {
      expect(() => new McpKillSwitchGuard().canActivate(ctx())).toThrow(
        ServiceUnavailableException,
      );
    } finally {
      process.env = original;
    }
  });

  it("kill switch passes by default", () => {
    set({ MCP_ENABLED: "" });
    try {
      expect(new McpKillSwitchGuard().canActivate(ctx())).toBe(true);
    } finally {
      process.env = original;
    }
  });

  it("allowlist guard answers 404 feature_disabled for others in production", () => {
    set({ NODE_ENV: "production", MCP_ALLOWED_USER_IDS: "owner", MCP_OPEN_ACCESS: "" });
    try {
      expect(new McpAllowlistGuard().canActivate(ctx({ id: "owner" }))).toBe(true);
      expect(() => new McpAllowlistGuard().canActivate(ctx({ id: "friend" }))).toThrow(
        NotFoundException,
      );
    } finally {
      process.env = original;
    }
  });
});
