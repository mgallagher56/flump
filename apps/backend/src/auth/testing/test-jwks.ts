import { exportJWK, generateKeyPair, type JWK, type JWTVerifyGetKey, SignJWT } from "jose";

export interface SignOptions {
  alg?: string;
  expiresIn?: string;
  notBefore?: string;
  issuer?: string;
  noSub?: boolean;
}

export async function createTestJwks(): Promise<{
  jwks: JWTVerifyGetKey;
  issuer: string;
  kid: string;
  publicJwk: JWK;
  sign(claims: object, opts?: SignOptions): Promise<string>;
  foreignSign(claims: object): Promise<string>;
}> {
  const kid = "test-key-1";
  const issuer = "https://test.workos.example/user_management/client_test";
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const { privateKey: foreignKey } = await generateKeyPair("RS256");
  const publicJwk = { ...(await exportJWK(publicKey)), kid, alg: "RS256" };

  const jwks: JWTVerifyGetKey = async () => publicKey;

  const build = async (claims: object, key: typeof privateKey, opts: SignOptions = {}) => {
    const jwt = new SignJWT({ ...claims } as Record<string, unknown>)
      .setProtectedHeader({ alg: opts.alg ?? "RS256", kid })
      .setIssuer(opts.issuer ?? issuer)
      .setIssuedAt()
      .setExpirationTime(opts.expiresIn ?? "1h");
    if (opts.notBefore) jwt.setNotBefore(opts.notBefore);
    return jwt.sign(key);
  };

  return {
    jwks,
    issuer,
    kid,
    publicJwk,
    sign: (claims, opts) => build(claims, privateKey, opts),
    foreignSign: (claims) => build(claims, foreignKey),
  };
}
