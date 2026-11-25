/**
 * The e2e fixture server (E12 S2c, plan section 9.5): a WorkOS stand-in and a canned `/v1` on one
 * port, for Maestro flows on an Android emulator and for Jest. CI never signs in to real WorkOS.
 *
 * WorkOS stand-in (the AuthKit routes the app calls, as documented on workos.com/docs):
 *   GET  /user_management/authorize          PKCE (S256 only) and state; redirects back with a code
 *   POST /user_management/authenticate       authorization_code and refresh_token grants, no secret
 *   GET  /sso/jwks/:clientId                 the public signing key
 *   GET  /user_management/sessions/logout    sends the browser back to a registered address
 * Canned /v1:
 *   GET  /v1/app/client-policy               public
 *   GET  /v1/user-profile                    bearer; 401 or 403 not_invited by scenario
 *   anything else under /v1                  404 not_found, so a missing fixture is loud
 * Control (flows set the scenario before they launch the app):
 *   POST /__fixture/scenario, POST /__fixture/revoke, POST /__fixture/reset, GET /__fixture/stats
 *
 * Refresh tokens are replaced on every use and the old one is rejected at once. Whether real
 * WorkOS does the same is an open question for the S2a spike; the stand-in takes the strict case.
 */
import { createHash, randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { cannedClientPolicy, cannedProfile, FIXTURE_PERSON } from "./fixtures";
import { newSigningKey, opaque, publicJwk, signJwt, verifyJwt } from "./tokens";

/** The port flows and the `e2e` build profile use. The production bundle must not contain it. */
export const FIXTURE_PORT = 8787;
/** The Android emulator's name for the computer it runs on. */
export const EMULATOR_HOST = "10.0.2.2";
/** The app's sign-in redirect (plan section 5.2, owner step OS1 registers it with real WorkOS). */
const APP_REDIRECT = "flump://auth/callback";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

const CODE_LIFETIME_MS = 10 * 60 * 1000;

interface Scenario {
  /** `not-invited`: `/v1` answers 403 not_invited, as the closed beta does. */
  account: "invited" | "not-invited";
  /** `denied`: authorize sends the browser back with `error=access_denied`. */
  signIn: "ok" | "denied";
  /** `rejected`: every refresh is `invalid_grant`. `unavailable`: 503, the token stays usable. */
  refresh: "ok" | "rejected" | "unavailable";
  /** Access token lifetime. 0 issues tokens that are already expired. */
  accessTokenSeconds: number;
  /** The client policy's minimum version, for the update-required screen. */
  minVersion: string;
}

const DEFAULT_SCENARIO: Scenario = {
  account: "invited",
  signIn: "ok",
  refresh: "ok",
  accessTokenSeconds: 300,
  minVersion: "0.0.0",
};

const ALLOWED: { [K in keyof Scenario]: (v: unknown) => boolean } = {
  account: (v) => v === "invited" || v === "not-invited",
  signIn: (v) => v === "ok" || v === "denied",
  refresh: (v) => v === "ok" || v === "rejected" || v === "unavailable",
  accessTokenSeconds: (v) => typeof v === "number" && Number.isInteger(v) && v >= 0,
  minVersion: (v) => typeof v === "string" && /^\d{1,5}(\.\d{1,5}){0,2}$/.test(v),
};

/** A scenario patch, or undefined when any key or value is unknown. */
function parseScenarioPatch(input: unknown): Partial<Scenario> | undefined {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return undefined;
  for (const [key, value] of Object.entries(input)) {
    const check = ALLOWED[key as keyof Scenario];
    if (!check?.(value)) return undefined;
  }
  return input as Partial<Scenario>;
}

interface FixtureStats {
  exchanges: number;
  refreshes: number;
  apiRequests: number;
}

export interface FixtureServerOptions {
  /** 0 picks a free port (tests). */
  port: number;
  /** Loopback only (127.0.0.1 by default): the emulator reaches the host's loopback as 10.0.2.2. */
  host?: string;
  clientId: string;
  /** The origin the app uses to reach this server, used in the token issuer. */
  publicOrigin?: string;
  redirectUris?: readonly string[];
  /** Injected clock in milliseconds, so tests never wait. */
  now?: () => number;
}

export interface FixtureServer {
  readonly origin: string;
  readonly publicOrigin: string;
  setScenario(patch: Partial<Scenario>): void;
  stats(): FixtureStats;
  close(): Promise<void>;
}

interface PendingCode {
  challenge: string;
  redirectUri: string;
  issuedAt: number;
}

interface Session {
  id: string;
  userId: string;
  revoked: boolean;
}

export async function startFixtureServer(options: FixtureServerOptions): Promise<FixtureServer> {
  const now = options.now ?? Date.now;
  const host = options.host ?? "127.0.0.1";
  // Test tokens and a scenario switch must never be reachable from another machine.
  if (!LOOPBACK_HOSTS.has(host)) {
    throw new Error(`The fixture server listens on loopback only, not ${host}.`);
  }
  const redirectUris = new Set(options.redirectUris ?? [APP_REDIRECT]);
  const key = newSigningKey();
  const userId = `user_${opaque(12)}`;

  let scenario: Scenario = { ...DEFAULT_SCENARIO };
  let counts: FixtureStats = { exchanges: 0, refreshes: 0, apiRequests: 0 };
  const codes = new Map<string, PendingCode>();
  /** Refresh token to session. A used token is deleted, so reuse is rejected. */
  const refreshTokens = new Map<string, Session>();
  const sessions = new Map<string, Session>();
  let publicOrigin = options.publicOrigin ?? "";

  const issuer = () => `${publicOrigin}/user_management/${options.clientId}`;

  function issueTokens(session: Session) {
    const iat = Math.floor(now() / 1000);
    const accessToken = signJwt(key, {
      iss: issuer(),
      sub: session.userId,
      sid: session.id,
      client_id: options.clientId,
      iat,
      exp: iat + scenario.accessTokenSeconds,
    });
    const refreshToken = opaque();
    refreshTokens.set(refreshToken, session);
    return {
      user: {
        object: "user",
        id: session.userId,
        email: FIXTURE_PERSON.email,
        first_name: FIXTURE_PERSON.firstName,
        last_name: FIXTURE_PERSON.lastName,
        email_verified: true,
      },
      access_token: accessToken,
      refresh_token: refreshToken,
      authentication_method: "Password",
    };
  }

  /** The signed-in session for a bearer token, or undefined (missing, forged, expired, revoked). */
  function sessionFor(req: IncomingMessage): Session | undefined {
    const auth = req.headers.authorization ?? "";
    if (!auth.startsWith("Bearer ")) return undefined;
    const claims = verifyJwt(key, auth.slice("Bearer ".length));
    if (!claims || claims.iss !== issuer() || claims.client_id !== options.clientId)
      return undefined;
    if (typeof claims.exp !== "number" || now() >= claims.exp * 1000) return undefined;
    const session = sessions.get(String(claims.sid));
    return session && !session.revoked ? session : undefined;
  }

  function handleAuthorize(url: URL, res: ServerResponse) {
    const q = url.searchParams;
    const redirectUri = q.get("redirect_uri") ?? "";
    const state = q.get("state") ?? "";
    const challenge = q.get("code_challenge") ?? "";
    // Anything wrong with the request itself is refused here, never sent to the redirect address.
    if (
      q.get("client_id") !== options.clientId ||
      !redirectUris.has(redirectUri) ||
      q.get("response_type") !== "code" ||
      q.get("code_challenge_method") !== "S256" ||
      !/^[A-Za-z0-9_-]{43}$/.test(challenge) ||
      state === ""
    ) {
      return oauthError(res, 400, "invalid_request");
    }
    const back = new URL(redirectUri);
    back.searchParams.set("state", state);
    if (scenario.signIn === "denied") {
      back.searchParams.set("error", "access_denied");
    } else {
      const code = opaque();
      codes.set(code, { challenge, redirectUri, issuedAt: now() });
      back.searchParams.set("code", code);
    }
    res.writeHead(302, { location: back.toString() }).end();
  }

  function handleAuthenticate(body: Record<string, string>, res: ServerResponse) {
    if (body.client_id !== options.clientId) return oauthError(res, 400, "invalid_client");
    // The app is a public client: a secret in the request means one was shipped in the bundle.
    if (body.client_secret !== undefined) return oauthError(res, 400, "invalid_client");

    if (body.grant_type === "authorization_code") {
      const pending = codes.get(body.code ?? "");
      codes.delete(body.code ?? "");
      const verifier = body.code_verifier ?? "";
      const expected = createHash("sha256").update(verifier).digest("base64url");
      if (
        !pending ||
        now() - pending.issuedAt >= CODE_LIFETIME_MS ||
        expected !== pending.challenge
      ) {
        return oauthError(res, 400, "invalid_grant");
      }
      counts.exchanges += 1;
      const session: Session = { id: `session_${opaque(12)}`, userId, revoked: false };
      sessions.set(session.id, session);
      return json(res, 200, issueTokens(session));
    }

    if (body.grant_type === "refresh_token") {
      counts.refreshes += 1;
      const session = refreshTokens.get(body.refresh_token ?? "");
      if (scenario.refresh === "unavailable") {
        return json(res, 503, { error: "service_unavailable" });
      }
      refreshTokens.delete(body.refresh_token ?? "");
      if (!session || session.revoked || scenario.refresh === "rejected") {
        return oauthError(res, 400, "invalid_grant");
      }
      return json(res, 200, issueTokens(session));
    }

    return oauthError(res, 400, "unsupported_grant_type");
  }

  function handleV1(path: string, req: IncomingMessage, res: ServerResponse) {
    counts.apiRequests += 1;
    if (req.method === "GET" && path === "/app/client-policy") {
      return json(res, 200, cannedClientPolicy(scenario.minVersion));
    }
    if (req.method === "GET" && path === "/user-profile") {
      const session = sessionFor(req);
      if (!session) return apiError(res, 401, "unauthorized", "Sign in to continue.");
      if (scenario.account === "not-invited") {
        return apiError(res, 403, "not_invited", "This account is not on the beta list.");
      }
      return json(res, 200, cannedProfile(session.userId, new Date(now())));
    }
    return apiError(res, 404, "not_found", "No canned response for this route.");
  }

  async function route(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? "/", "http://fixture.invalid");
    const path = url.pathname;

    if (req.method === "GET" && path === "/user_management/authorize") {
      return handleAuthorize(url, res);
    }
    if (req.method === "POST" && path === "/user_management/authenticate") {
      return handleAuthenticate(await readForm(req), res);
    }
    if (req.method === "GET" && path === `/sso/jwks/${options.clientId}`) {
      return json(res, 200, { keys: [publicJwk(key)] });
    }
    if (req.method === "GET" && path === "/user_management/sessions/logout") {
      const returnTo = url.searchParams.get("return_to") ?? "";
      if (!redirectUris.has(returnTo)) return oauthError(res, 400, "invalid_request");
      return void res.writeHead(302, { location: returnTo }).end();
    }
    if (path.startsWith("/v1/")) return handleV1(path.slice("/v1".length), req, res);

    if (req.method === "POST" && path === "/__fixture/scenario") {
      const patch = parseScenarioPatch(await readJson(req));
      if (!patch) return json(res, 400, { error: "unknown scenario key or value" });
      scenario = { ...scenario, ...patch };
      return void res.writeHead(204).end();
    }
    if (req.method === "POST" && path === "/__fixture/revoke") {
      for (const session of sessions.values()) session.revoked = true;
      return void res.writeHead(204).end();
    }
    if (req.method === "POST" && path === "/__fixture/reset") {
      reset();
      return void res.writeHead(204).end();
    }
    if (req.method === "GET" && path === "/__fixture/stats") return json(res, 200, counts);

    return json(res, 404, { error: "not_found" });
  }

  function reset() {
    scenario = { ...DEFAULT_SCENARIO };
    counts = { exchanges: 0, refreshes: 0, apiRequests: 0 };
    codes.clear();
    refreshTokens.clear();
    sessions.clear();
  }

  const server = createServer((req, res) => {
    route(req, res).catch(() => {
      if (!res.headersSent) json(res, 500, { error: "fixture_error" });
    });
  });
  await new Promise<void>((resolve) => server.listen(options.port, host, resolve));
  const { port } = server.address() as AddressInfo;
  const origin = `http://${host}:${port}`;
  if (!publicOrigin) publicOrigin = origin;

  return {
    origin,
    publicOrigin,
    setScenario(patch) {
      const checked = parseScenarioPatch(patch);
      if (!checked) throw new Error("unknown scenario key or value");
      scenario = { ...scenario, ...checked };
    },
    stats: () => ({ ...counts }),
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections();
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body));
}

function oauthError(res: ServerResponse, status: number, error: string) {
  json(res, status, { error, error_description: error.replaceAll("_", " ") });
}

/** The backend's one error body (`ErrorResponse` in the contract), with the matching header. */
function apiError(res: ServerResponse, status: number, code: string, message: string) {
  const requestId = randomUUID();
  res
    .writeHead(status, { "content-type": "application/json", "x-request-id": requestId })
    .end(JSON.stringify({ code, message, requestId }));
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  try {
    return JSON.parse(await readBody(req));
  } catch {
    return undefined;
  }
}

/** A JSON or form-encoded body as string fields. Other value types are dropped. */
async function readForm(req: IncomingMessage): Promise<Record<string, string>> {
  const text = await readBody(req);
  const type = req.headers["content-type"] ?? "";
  const entries: [string, unknown][] = type.includes("application/x-www-form-urlencoded")
    ? [...new URLSearchParams(text).entries()]
    : Object.entries(safeObject(text));
  return Object.fromEntries(entries.filter((e): e is [string, string] => typeof e[1] === "string"));
}

function safeObject(text: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
