import { describe, expect, it } from "vitest";
import {
  AuthenticationError,
  hashPatToken,
  type McpTokenRecord,
  type McpTokenStoreAdapter,
  TokenVerifier,
} from "./token-verifier.js";

const PAT = "flump_pat_0123456789abcdef0123456789abcdef";

function storeWith(record: Partial<McpTokenRecord> | null): McpTokenStoreAdapter {
  return {
    async findTokenByHash(hash) {
      if (!record || hash !== hashPatToken(PAT)) return null;
      return {
        id: "tok_1",
        userId: "user_abc",
        tokenHash: hash,
        scopes: ["mcp:read:anonymized", "mcp:simulate"],
        anonymizeInstitutions: true,
        expiresAt: null,
        revokedAt: null,
        ...record,
      };
    },
  };
}

describe("TokenVerifier (PAT-only)", () => {
  it("rejects the mock tokens by default", async () => {
    const verifier = new TokenVerifier();
    for (const token of ["mock-session-token", "mock_mcp_x"]) {
      await expect(verifier.verifyAuthorizationHeader(`Bearer ${token}`)).rejects.toBeInstanceOf(
        AuthenticationError,
      );
    }
  });

  it("accepts only the exact configured dev token and returns the dev identity", async () => {
    const verifier = new TokenVerifier({ devToken: "dev-secret", devUserId: "dev_1" });
    await expect(verifier.verifyAuthorizationHeader("Bearer dev-secret")).resolves.toEqual({
      userId: "dev_1",
      scopes: ["mcp:read:anonymized", "mcp:simulate"],
      anonymizeInstitutions: true,
      type: "dev",
    });
    await expect(verifier.verifyAuthorizationHeader("Bearer other")).rejects.toBeInstanceOf(
      AuthenticationError,
    );
    await expect(verifier.verifyAuthorizationHeader("Bearer mock_mcp_x")).rejects.toBeInstanceOf(
      AuthenticationError,
    );
  });

  it("defaults the dev user id", async () => {
    const verifier = new TokenVerifier({ devToken: "dev-secret" });
    const verified = await verifier.verifyAuthorizationHeader("Bearer dev-secret");
    expect(verified.userId).toBe("dev_user");
  });

  it("rejects an unsigned JWT-shaped token", async () => {
    const payload = Buffer.from(JSON.stringify({ sub: "attacker" })).toString("base64");
    const verifier = new TokenVerifier();
    const err = await verifier
      .verifyAuthorizationHeader(`Bearer eyJhbGciOiJub25lIn0.${payload}.sig`)
      .catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.message).toBe("OAuth tokens are not enabled");
  });

  it("rejects missing, malformed and empty headers", async () => {
    const verifier = new TokenVerifier();
    for (const header of [undefined, "Basic abc", "Bearer ", "Bearer    "]) {
      await expect(verifier.verifyAuthorizationHeader(header)).rejects.toBeInstanceOf(
        AuthenticationError,
      );
    }
  });

  it("resolves a valid PAT", async () => {
    const verifier = new TokenVerifier({ tokenStore: storeWith({}) });
    await expect(verifier.verifyAuthorizationHeader(`Bearer ${PAT}`)).resolves.toMatchObject({
      userId: "user_abc",
      tokenId: "tok_1",
      type: "pat",
    });
  });

  it("hashes a whitespace-padded PAT the same", async () => {
    const verifier = new TokenVerifier({ tokenStore: storeWith({}) });
    await expect(verifier.verifyAuthorizationHeader(`Bearer   ${PAT}  `)).resolves.toMatchObject({
      userId: "user_abc",
    });
  });

  it("rejects revoked, expired and unknown PATs", async () => {
    const cases: Array<Partial<McpTokenRecord> | null> = [
      { revokedAt: new Date() },
      { expiresAt: new Date(Date.now() - 1000) },
      null,
    ];
    for (const record of cases) {
      const verifier = new TokenVerifier({ tokenStore: storeWith(record) });
      const err = await verifier.verifyAuthorizationHeader(`Bearer ${PAT}`).catch((e) => e);
      expect(err).toBeInstanceOf(AuthenticationError);
      expect(err.message).not.toContain(PAT);
    }
  });

  it("rejects a PAT when no token store is configured", async () => {
    const verifier = new TokenVerifier();
    await expect(verifier.verifyAuthorizationHeader(`Bearer ${PAT}`)).rejects.toBeInstanceOf(
      AuthenticationError,
    );
  });
});
