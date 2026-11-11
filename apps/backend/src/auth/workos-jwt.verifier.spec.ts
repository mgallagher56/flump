import { Logger } from "@nestjs/common";
import { SignJWT } from "jose";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createTestJwks } from "./testing/test-jwks";
import { WorkOsJwtVerifier, workosIssuers } from "./workos-jwt.verifier";

async function setup() {
  const t = await createTestJwks();
  return {
    t,
    verifier: new WorkOsJwtVerifier({ jwks: t.jwks, issuer: t.issuer }),
  };
}

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");

describe("WorkOsJwtVerifier", () => {
  beforeAll(() => {
    Logger.overrideLogger(false);
  });

  it("resolves a valid token to the authenticated user", async () => {
    const { t, verifier } = await setup();
    const token = await t.sign({ sub: "user_1", email: "a@b.co" });
    await expect(verifier.verify(token)).resolves.toEqual({
      id: "user_1",
      email: "a@b.co",
    });
  });

  it("leaves email undefined when the claim is absent", async () => {
    const { t, verifier } = await setup();
    const user = await verifier.verify(await t.sign({ sub: "user_1" }));
    expect(user.email).toBeUndefined();
  });

  it("rejects a token signed by a different key", async () => {
    const { t, verifier } = await setup();
    await expect(verifier.verify(await t.foreignSign({ sub: "user_1" }))).rejects.toThrow(
      "invalid token",
    );
  });

  it("rejects a wrong issuer", async () => {
    const { t, verifier } = await setup();
    const token = await t.sign({ sub: "user_1" }, { issuer: "https://evil.example/" });
    await expect(verifier.verify(token)).rejects.toThrow("invalid token");
  });

  it("rejects an expired token", async () => {
    const { t, verifier } = await setup();
    const token = await t.sign({ sub: "user_1" }, { expiresIn: "-1h" });
    await expect(verifier.verify(token)).rejects.toThrow("invalid token");
  });

  it("rejects a token that is not yet valid (future nbf)", async () => {
    const { t, verifier } = await setup();
    const token = await t.sign({ sub: "user_1" }, { notBefore: "1h" });
    await expect(verifier.verify(token)).rejects.toThrow("invalid token");
  });

  it("rejects a token with no sub", async () => {
    const { t, verifier } = await setup();
    const token = await t.sign({ sub: "user_1", email: "a@b.co" }, { noSub: true });
    await expect(verifier.verify(token)).rejects.toThrow("invalid token");
  });

  it("rejects a validly signed token with no exp", async () => {
    const { t, verifier } = await setup();
    const token = await t.sign({ sub: "user_1" }, { noExp: true });
    await expect(verifier.verify(token)).rejects.toThrow("invalid token");
  });

  it("rejects alg none", async () => {
    const { t, verifier } = await setup();
    const token = `${b64({ alg: "none", typ: "JWT" })}.${b64({
      sub: "user_1",
      iss: t.issuer,
      exp: Math.floor(Date.now() / 1000) + 3600,
    })}.`;
    await expect(verifier.verify(token)).rejects.toThrow("invalid token");
  });

  it("rejects HS256 signed with the public JWK material (algorithm confusion)", async () => {
    const { t, verifier } = await setup();
    const secret = new TextEncoder().encode(JSON.stringify(t.publicJwk));
    const token = await new SignJWT({ sub: "user_1" })
      .setProtectedHeader({ alg: "HS256", kid: t.kid })
      .setIssuer(t.issuer)
      .setExpirationTime("1h")
      .sign(secret);
    await expect(verifier.verify(token)).rejects.toThrow("invalid token");
  });

  it("rejects when the JWKS getter fails", async () => {
    const { t } = await setup();
    const verifier = new WorkOsJwtVerifier({
      jwks: async () => {
        throw new Error("network down");
      },
      issuer: t.issuer,
    });
    await expect(verifier.verify(await t.sign({ sub: "user_1" }))).rejects.toThrow("invalid token");
  });
});

describe("WorkOsJwtVerifier issuer list", () => {
  const CLIENT = "client_x";
  const BARE = "https://api.workos.com";
  const UM = `https://api.workos.com/user_management/${CLIENT}`;

  async function withIssuers(env: Record<string, string | undefined>) {
    const t = await createTestJwks();
    const verifier = new WorkOsJwtVerifier({ jwks: t.jwks, issuer: workosIssuers(CLIENT, env) });
    return { t, verifier };
  }

  it("default list accepts the bare issuer", async () => {
    const { t, verifier } = await withIssuers({});
    await expect(verifier.verify(await t.sign({ sub: "u" }, { issuer: BARE }))).resolves.toEqual({
      id: "u",
      email: undefined,
    });
  });

  it("default list accepts the user_management issuer", async () => {
    const { t, verifier } = await withIssuers({});
    await expect(
      verifier.verify(await t.sign({ sub: "u" }, { issuer: UM })),
    ).resolves.toBeDefined();
  });

  it("default list rejects any other issuer", async () => {
    const { t, verifier } = await withIssuers({});
    await expect(
      verifier.verify(await t.sign({ sub: "u" }, { issuer: "https://evil.example" })),
    ).rejects.toThrow("invalid token");
  });

  it("WORKOS_ISSUER replaces the defaults", async () => {
    const { t, verifier } = await withIssuers({ WORKOS_ISSUER: "https://auth.example.com" });
    await expect(
      verifier.verify(await t.sign({ sub: "u" }, { issuer: "https://auth.example.com" })),
    ).resolves.toBeDefined();
    await expect(verifier.verify(await t.sign({ sub: "u" }, { issuer: BARE }))).rejects.toThrow(
      "invalid token",
    );
    await expect(verifier.verify(await t.sign({ sub: "u" }, { issuer: UM }))).rejects.toThrow(
      "invalid token",
    );
  });

  it("WORKOS_ISSUER is comma-separated, trimmed, empty entries dropped", async () => {
    expect(
      workosIssuers(CLIENT, { WORKOS_ISSUER: " https://a.example , ,https://b.example," }),
    ).toEqual(["https://a.example", "https://b.example"]);
    const { t, verifier } = await withIssuers({
      WORKOS_ISSUER: "https://a.example, https://b.example",
    });
    await expect(
      verifier.verify(await t.sign({ sub: "u" }, { issuer: "https://b.example" })),
    ).resolves.toBeDefined();
  });

  it("an empty WORKOS_ISSUER falls back to the defaults", () => {
    expect(workosIssuers(CLIENT, { WORKOS_ISSUER: " , " })).toEqual([BARE, UM]);
  });
});

describe("WorkOsJwtVerifier diagnostics", () => {
  it("warns with the failing claim name and never the token", async () => {
    const { t, verifier } = await setup();
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    const token = await t.sign({ sub: "user_1" }, { issuer: "https://evil.example/" });
    await expect(verifier.verify(token)).rejects.toThrow("invalid token");
    const lines = warn.mock.calls.map((c) => String(c[0]));
    warn.mockRestore();
    expect(
      lines.some((l) => l.includes("claim=iss") && l.includes("ERR_JWT_CLAIM_VALIDATION_FAILED")),
    ).toBe(true);
    expect(lines.some((l) => l.includes(token) || l.includes("evil.example"))).toBe(false);
  });

  it("logs the expected issuer list once at init", async () => {
    const t = await createTestJwks();
    const log = vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    new WorkOsJwtVerifier({ jwks: t.jwks, issuer: ["https://a.example", "https://b.example"] });
    const lines = log.mock.calls.map((c) => String(c[0]));
    log.mockRestore();
    expect(
      lines.some((l) => l.includes("https://a.example") && l.includes("https://b.example")),
    ).toBe(true);
  });
});
