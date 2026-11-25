/**
 * Test tokens for the WorkOS stand-in (E12 S2c). The signing key is made fresh each time the
 * server starts and lives only in memory, so no key or token is ever written to the repo.
 */
import { generateKeyPairSync, type KeyObject, randomBytes, sign, verify } from "node:crypto";

export interface SigningKey {
  readonly kid: string;
  readonly privateKey: KeyObject;
  readonly publicKey: KeyObject;
}

export function newSigningKey(): SigningKey {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return { kid: `fixture_${randomBytes(6).toString("hex")}`, privateKey, publicKey };
}

/** The public half as a JWKS entry, the shape `GET /sso/jwks/:clientId` returns. */
export function publicJwk(key: SigningKey) {
  const jwk = key.publicKey.export({ format: "jwk" });
  return { ...jwk, kid: key.kid, alg: "RS256", use: "sig" };
}

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

export type Claims = Record<string, string | number>;

export function signJwt(key: SigningKey, claims: Claims): string {
  const head = encode({ alg: "RS256", typ: "JWT", kid: key.kid });
  const body = encode(claims);
  const signature = sign("RSA-SHA256", Buffer.from(`${head}.${body}`), key.privateKey);
  return `${head}.${body}.${signature.toString("base64url")}`;
}

/** The claims of a token this key signed, or undefined for anything else. Expiry is checked by the caller. */
export function verifyJwt(key: SigningKey, token: string): Claims | undefined {
  const parts = token.split(".");
  if (parts.length !== 3) return undefined;
  const [head, body, signature] = parts as [string, string, string];
  try {
    const header = JSON.parse(Buffer.from(head, "base64url").toString()) as Record<string, unknown>;
    if (header.alg !== "RS256" || header.kid !== key.kid) return undefined;
    const ok = verify(
      "RSA-SHA256",
      Buffer.from(`${head}.${body}`),
      key.publicKey,
      Buffer.from(signature, "base64url"),
    );
    if (!ok) return undefined;
    return JSON.parse(Buffer.from(body, "base64url").toString()) as Claims;
  } catch {
    return undefined;
  }
}

/** An opaque random value: authorisation codes, refresh tokens, session ids. */
export const opaque = (bytes = 32) => randomBytes(bytes).toString("base64url");
