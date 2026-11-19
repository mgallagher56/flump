import { describe, expect, it, vi } from "vitest";
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
        expiresAt: new Date(Date.now() + 86_400_000),
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
    expect(err.message).toBe(
      "OAuth tokens are not accepted. Use a token created in Flump under AI connections.",
    );
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

  it("rejects a PAT whose row has no expiry or an unreadable one (S2)", async () => {
    for (const expiresAt of [null, new Date(Number.NaN)]) {
      const verifier = new TokenVerifier({ tokenStore: storeWith({ expiresAt }) });
      const err = await verifier.verifyAuthorizationHeader(`Bearer ${PAT}`).catch((e) => e);
      expect(err).toBeInstanceOf(AuthenticationError);
      expect(err.message).toContain("no expiry");
    }
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

  it("treats the Bearer scheme case-insensitively", async () => {
    const verifier = new TokenVerifier({ devToken: "dev-secret" });
    for (const scheme of ["bearer", "BEARER", "BeArEr"]) {
      await expect(
        verifier.verifyAuthorizationHeader(`${scheme} dev-secret`),
      ).resolves.toMatchObject({ type: "dev" });
    }
  });
});

describe("TokenVerifier details", () => {
  const reasonFor = async (verifier: TokenVerifier, header?: string) =>
    ((await verifier.verifyAuthorizationHeader(header).catch((e) => e)) as Error).message;

  it("throws errors named AuthenticationError, the name the transport logs", async () => {
    const err = await new TokenVerifier().verifyAuthorizationHeader(undefined).catch((e) => e);
    expect(err.name).toBe("AuthenticationError");
  });

  it("says why a token was refused", async () => {
    expect(await reasonFor(new TokenVerifier(), undefined)).toMatch(/Authorization header/);
    expect(await reasonFor(new TokenVerifier(), "Bearer    ")).toMatch(/empty/i);
    expect(
      await reasonFor(
        new TokenVerifier({ tokenStore: storeWith({ revokedAt: new Date() }) }),
        `Bearer ${PAT}`,
      ),
    ).toMatch(/revoked/);
    expect(
      await reasonFor(
        new TokenVerifier({ tokenStore: storeWith({ expiresAt: new Date(Date.now() - 60_000) }) }),
        `Bearer ${PAT}`,
      ),
    ).toMatch(/expired/);
    expect(
      await reasonFor(new TokenVerifier({ tokenStore: storeWith(null) }), `Bearer ${PAT}`),
    ).toMatch(/not recognised/);
    expect(await reasonFor(new TokenVerifier(), `Bearer ${PAT}`)).toMatch(/not recognised/);
  });

  it("rejects a header that does not start with the scheme, or that runs onto a second line", async () => {
    const verifier = new TokenVerifier({ devToken: "dev-secret" });
    for (const header of ["xBearer dev-secret", "Bearer dev-secret\nX-Other: 1"]) {
      await expect(verifier.verifyAuthorizationHeader(header)).rejects.toBeInstanceOf(
        AuthenticationError,
      );
    }
  });

  it("ignores whitespace around the token, so a padded dev token still matches exactly", async () => {
    const verifier = new TokenVerifier({ devToken: "dev-secret" });
    await expect(verifier.verifyAuthorizationHeader("Bearer dev-secret  ")).resolves.toMatchObject({
      type: "dev",
    });
  });

  it("gives a row with no stored scopes the default anonymised read and simulate scopes", async () => {
    const verifier = new TokenVerifier({
      tokenStore: storeWith({ scopes: null as unknown as string[] }),
    });
    const verified = await verifier.verifyAuthorizationHeader(`Bearer ${PAT}`);
    expect(verified.scopes).toEqual(["mcp:read:anonymized", "mcp:simulate"]);
    expect(verified.anonymizeInstitutions).toBe(true);
  });

  it("hashes with SHA-256 over the trimmed token", () => {
    // FIPS 180-2 test vector: SHA-256("abc").
    const abc = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
    expect(hashPatToken("abc")).toBe(abc);
    expect(hashPatToken("  abc\t")).toBe(abc);
  });

  it("publishes protected resource metadata, with defaults and overrides", () => {
    expect(new TokenVerifier().getOAuthProtectedResourceMetadata()).toEqual({
      resource: "flump-mcp",
      authorization_servers: ["https://api.workos.com"],
      scopes_supported: ["mcp:read:anonymized", "mcp:read:full", "mcp:simulate", "write:stage"],
      bearer_methods_supported: ["header"],
    });
    const custom = new TokenVerifier({
      expectedAudience: "https://mcp.example.test",
      authServerUrl: "https://auth.example.test",
    }).getOAuthProtectedResourceMetadata();
    expect(custom.resource).toBe("https://mcp.example.test");
    expect(custom.authorization_servers).toEqual(["https://auth.example.test"]);
  });

  it("records a request through the store when it can, and is a no-op when it cannot", async () => {
    const recordRequest = vi.fn().mockResolvedValue(undefined);
    await new TokenVerifier({
      tokenStore: { ...storeWith({}), recordRequest },
    }).recordRequest("tok_1", 2);
    expect(recordRequest).toHaveBeenCalledWith("tok_1", 2);
    await expect(
      new TokenVerifier({ tokenStore: storeWith({}) }).recordRequest("tok_1", 1),
    ).resolves.toBeUndefined();
    await expect(new TokenVerifier().recordRequest("tok_1", 1)).resolves.toBeUndefined();
  });
});
