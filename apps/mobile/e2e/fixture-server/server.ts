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
 *   GET  /v1/accounts                        bearer; six manual accounts, `details: []` (S3)
 *   GET  /v1/account-details                 bearer; their monthly rows, nothing this month
 *   GET  /v1/snapshots/check-ins             bearer; last month started and completed
 *   PUT  /v1/snapshots/:month                bearer; applied as the backend does (fixtures.ts)
 *   anything else under /v1                  404 not_found, so a missing fixture is loud
 *   The four check-in routes ignore query strings (`?details=none`, `?limit=`) and answer 401,
 *   403 not_invited and 403 terms_not_accepted as the profile does.
 * Scenarios (POST /__fixture/scenario with a JSON patch; every reset restores the defaults):
 *   account  invited | not-invited          not-invited: /v1 answers 403 not_invited
 *   signIn   ok | denied                    denied: authorize returns error=access_denied
 *   refresh  ok | rejected | unavailable    every refresh invalid_grant, or 503
 *   accessTokenSeconds, minVersion          token lifetime; the client policy's minimum version
 *   data     ok | unavailable | empty       the check-in routes: canned data, 503
 *                                           service_unavailable, or no accounts and no months
 *   terms    agreed | required              required: authenticated /v1 answers 403
 *                                           terms_not_accepted (PR #939), after not_invited
 * Control (flows set the scenario before they launch the app):
 *   POST /__fixture/scenario, POST /__fixture/revoke, POST /__fixture/reset (also rebuilds the
 *   check-in data), GET /__fixture/stats (counts, PUTs without `checkIn: true`, the check-in
 *   months and the current London month)
 *
 * Refresh tokens are replaced on every use and the old one is rejected at once. Whether real
 * WorkOS does the same is an open question for the S2a spike; the stand-in takes the strict case.
 */
import { createHash, randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { SnapshotMonth, UpsertSnapshotRequest } from "@flump/api-contract";
import {
  applySnapshot,
  buildCheckInStore,
  type CheckInStore,
  cannedAccountDetails,
  cannedAccounts,
  cannedCheckIns,
  cannedClientPolicy,
  cannedProfile,
  FIXTURE_PERSON,
  londonMonth,
} from "./fixtures";
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
  /** The check-in routes: canned data, 503 service_unavailable, or no accounts at all. */
  data: "ok" | "unavailable" | "empty";
  /** `required`: authenticated `/v1` answers 403 terms_not_accepted until the terms are agreed. */
  terms: "agreed" | "required";
}

const DEFAULT_SCENARIO: Scenario = {
  account: "invited",
  signIn: "ok",
  refresh: "ok",
  accessTokenSeconds: 300,
  minVersion: "0.0.0",
  data: "ok",
  terms: "agreed",
};

const ALLOWED: { [K in keyof Scenario]: (v: unknown) => boolean } = {
  account: (v) => v === "invited" || v === "not-invited",
  signIn: (v) => v === "ok" || v === "denied",
  refresh: (v) => v === "ok" || v === "rejected" || v === "unavailable",
  accessTokenSeconds: (v) => typeof v === "number" && Number.isInteger(v) && v >= 0,
  minVersion: (v) => typeof v === "string" && /^\d{1,5}(\.\d{1,5}){0,2}$/.test(v),
  data: (v) => v === "ok" || v === "unavailable" || v === "empty",
  terms: (v) => v === "agreed" || v === "required",
};

/** A scenario patch, or undefined when any key or value is unknown. */
function parseScenarioPatch(input: unknown): Partial<Scenario> | undefined {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return undefined;
  for (const [key, value] of Object.entries(input)) {
    // Own keys only: `constructor` or `toString` must not pass through the prototype.
    if (!Object.hasOwn(ALLOWED, key)) return undefined;
    if (!ALLOWED[key as keyof Scenario](value)) return undefined;
  }
  return input as Partial<Scenario>;
}

interface FixtureCounts {
  exchanges: number;
  refreshes: number;
  apiRequests: number;
  /** `PUT /v1/snapshots/:month` requests past the sign-in and scenario checks. */
  snapshotPuts: number;
  /** Of those, the ones whose body did not carry `checkIn: true`. */
  putsWithoutCheckIn: number;
}

interface FixtureStats extends FixtureCounts {
  latestStartedMonth: string | null;
  latestCompletedMonth: string | null;
  /** The London month of the server's clock: the month a check-in now writes. */
  currentMonth: string;
}

const ZERO_COUNTS: FixtureCounts = {
  exchanges: 0,
  refreshes: 0,
  apiRequests: 0,
  snapshotPuts: 0,
  putsWithoutCheckIn: 0,
};

const CHECK_IN_ROUTES = new Set(["/accounts", "/account-details", "/snapshots/check-ins"]);

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

  /** The check-in data for `ok` and for `empty`, rebuilt (with new ids) on every reset. */
  const buildStores = () => ({
    ok: buildCheckInStore(userId, new Date(now()), "ok"),
    empty: buildCheckInStore(userId, new Date(now()), "empty"),
  });

  // Parse every canned body once now, so a contract change fails the start, not a flow.
  cannedProfile(userId, new Date(now()));
  cannedClientPolicy(DEFAULT_SCENARIO.minVersion);
  let stores = buildStores();

  let scenario: Scenario = { ...DEFAULT_SCENARIO };
  let counts: FixtureCounts = { ...ZERO_COUNTS };
  const store = (): CheckInStore => (scenario.data === "empty" ? stores.empty : stores.ok);
  const stats = (): FixtureStats => ({
    ...counts,
    latestStartedMonth: store().latestStartedMonth,
    latestCompletedMonth: store().latestCompletedMonth,
    currentMonth: londonMonth(new Date(now())),
  });
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

  /** The signed-in, invited session, or undefined once the 401 or 403 has been sent. */
  function invitedSession(req: IncomingMessage, res: ServerResponse): Session | undefined {
    const session = sessionFor(req);
    if (!session) {
      apiError(res, 401, "unauthorized", "Sign in to continue.");
      return undefined;
    }
    if (scenario.account === "not-invited") {
      apiError(res, 403, "not_invited", "This account is not on the beta list.");
      return undefined;
    }
    // The backend's order of refusals: erased, not invited, then terms not agreed (PR #939).
    if (scenario.terms === "required") {
      apiError(res, 403, "terms_not_accepted", "Agree to the terms to continue.");
      return undefined;
    }
    return session;
  }

  async function handleV1(path: string, req: IncomingMessage, res: ServerResponse) {
    counts.apiRequests += 1;
    if (req.method === "GET" && path === "/app/client-policy") {
      return json(res, 200, cannedClientPolicy(scenario.minVersion));
    }
    if (req.method === "GET" && path === "/user-profile") {
      const session = invitedSession(req, res);
      if (!session) return;
      return json(res, 200, cannedProfile(session.userId, new Date(now())));
    }
    const snapshotMonth = /^\/snapshots\/([^/]+)$/.exec(path)?.[1];
    const isSnapshotPut = req.method === "PUT" && snapshotMonth !== undefined;
    if ((req.method === "GET" && CHECK_IN_ROUTES.has(path)) || isSnapshotPut) {
      const session = invitedSession(req, res);
      if (!session) return;
      if (scenario.data === "unavailable") {
        return apiError(res, 503, "service_unavailable", "The service is not available.");
      }
      if (isSnapshotPut) return handleSnapshotPut(snapshotMonth, session, req, res);
      if (path === "/accounts") return json(res, 200, cannedAccounts(store()));
      if (path === "/account-details") return json(res, 200, cannedAccountDetails(store()));
      return json(res, 200, cannedCheckIns(store()));
    }
    return apiError(res, 404, "not_found", "No canned response for this route.");
  }

  async function handleSnapshotPut(
    rawMonth: string,
    session: Session,
    req: IncomingMessage,
    res: ServerResponse,
  ) {
    const raw = await readJson(req);
    counts.snapshotPuts += 1;
    const checkIn = typeof raw === "object" && raw !== null && "checkIn" in raw && raw.checkIn;
    // Anything but the boolean true counts, a string "true" included.
    if (checkIn !== true) counts.putsWithoutCheckIn += 1;
    if (raw === undefined) return apiError(res, 400, "invalid_json", "The body is not JSON.");
    const month = SnapshotMonth.safeParse(rawMonth);
    const body = UpsertSnapshotRequest.safeParse(raw);
    if (!month.success || !body.success) {
      const issues = [
        ...(month.success ? [] : month.error.issues.map((i) => ({ ...i, part: "params.month" }))),
        ...(body.success ? [] : body.error.issues.map((i) => ({ ...i, part: "body" }))),
      ].map((i) => ({
        path: [i.part, ...i.path.map(String)].join("."),
        code: i.code,
        message: i.message,
      }));
      return apiError(res, 400, "validation_failed", "The request is not valid.", issues);
    }
    const result = applySnapshot(store(), session.userId, month.data, body.data, new Date(now()));
    if ("status" in result) return apiError(res, result.status, result.code, result.message);
    return json(res, 200, result);
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
    if (req.method === "GET" && path === "/__fixture/stats") return json(res, 200, stats());

    return json(res, 404, { error: "not_found" });
  }

  function reset() {
    scenario = { ...DEFAULT_SCENARIO };
    counts = { ...ZERO_COUNTS };
    stores = buildStores();
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
    stats,
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
function apiError(
  res: ServerResponse,
  status: number,
  code: string,
  message: string,
  issues?: { path: string; code: string; message: string }[],
) {
  const requestId = randomUUID();
  res
    .writeHead(status, { "content-type": "application/json", "x-request-id": requestId })
    .end(
      JSON.stringify(issues ? { code, message, issues, requestId } : { code, message, requestId }),
    );
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
