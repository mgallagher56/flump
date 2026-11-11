import { Logger } from "@nestjs/common";
import { SignJWT } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { createTestJwks } from "./testing/test-jwks";
import { WorkOsJwtVerifier } from "./workos-jwt.verifier";

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
    const token = await t.sign({ email: "a@b.co" }, { noSub: true });
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
