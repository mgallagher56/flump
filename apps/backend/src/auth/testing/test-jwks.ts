import { exportJWK, generateKeyPair, type JWK, type JWTVerifyGetKey, SignJWT } from "jose";

export interface SignOptions {
  alg?: string;
  expiresIn?: string;
  notBefore?: string;
  issuer?: string;
  noSub?: boolean;
  noExp?: boolean;
}

// RSA-2048 keygen costs ~300ms each, so generate the pair once per test file (module scope) rather
// than per call. Within a pair the signing and foreign keys stay distinct.
let keyPairs:
  | Promise<{
      real: Awaited<ReturnType<typeof generateKeyPair>>;
      foreign: Awaited<ReturnType<typeof generateKeyPair>>;
    }>
  | undefined;

function getKeyPairs() {
  keyPairs ??= Promise.all([generateKeyPair("RS256"), generateKeyPair("RS256")]).then(
    ([real, foreign]) => ({ real, foreign }),
  );
  return keyPairs;
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
  const { real, foreign } = await getKeyPairs();
  const { publicKey, privateKey } = real;
  const { privateKey: foreignKey } = foreign;
  const publicJwk = { ...(await exportJWK(publicKey)), kid, alg: "RS256" };

  const jwks: JWTVerifyGetKey = async () => publicKey;

  const build = async (claims: object, key: typeof privateKey, opts: SignOptions = {}) => {
    const payload = { ...claims } as Record<string, unknown>;
    if (opts.noSub) delete payload.sub;
    const jwt = new SignJWT(payload)
      .setProtectedHeader({ alg: opts.alg ?? "RS256", kid })
      .setIssuer(opts.issuer ?? issuer)
      .setIssuedAt();
    if (!opts.noExp) jwt.setExpirationTime(opts.expiresIn ?? "1h");
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
