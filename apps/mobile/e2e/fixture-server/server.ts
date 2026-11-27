/**
 * The e2e fixture server (E12 S2c, plan section 9.5): a WorkOS stand-in and a canned `/v1` on one
 * port, for Maestro flows on an Android emulator and for Jest. CI never signs in to real WorkOS.
 *
 * WorkOS stand-in (the AuthKit routes the app calls, as documented on workos.com/docs):
 *   GET  /user_management/authorize          PKCE (S256 only) and state; redirects back with a code
 *   POST /user_management/authenticate       authorization_code and refresh_token grants, no secret
 *   GET  /sso/jwks/:clientId                 the public signing key
 * Canned /v1:
 *   GET  /v1/app/client-policy               public
 *   GET  /v1/user-profile                    bearer; 401 or 403 not_invited by scenario
 *   PATCH /v1/user-profile                   bearer; the strict UpdateProfileRequest body and,
 *                                           when sent, If-Match against the profile's version
 *                                           (412 precondition_failed); the change is kept until
 *                                           the next reset, so Home follows it (S9)
 *   POST /v1/session/sign-out                bearer; revokes the token's session (sid), 204.
 *                                           Like the backend, it serves people who are not
 *                                           invited or have not agreed to the terms
 *   GET  /v1/accounts                        bearer; six manual accounts, `details: []` (S3)
 *   GET  /v1/account-details                 bearer; their monthly rows, nothing this month
 *   GET  /v1/snapshots/check-ins             bearer; last month started and completed
 *   GET  /v1/budget-entries                  bearer; the household's saved budget (S5b), none for
 *                                           the canned data
 *   POST /v1/budget-entries                  bearer; the strict CreateBudgetEntryRequest body (S10)
 *   PATCH /v1/budget-entries/:id             bearer; the strict UpdateBudgetEntryRequest body and,
 *                                           when sent, If-Match against the row's version (412
 *                                           precondition_failed); 404 for an unknown row (S10)
 *   DELETE /v1/budget-entries/:id            bearer; `{ success: true }`, 404 for an unknown row.
 *                                           Budget writes are kept until the next reset (S10)
 *   PUT  /v1/snapshots/:month                bearer; applied as the backend does (fixtures.ts)
 *   GET  /v1/user-profile/export             bearer; the export as an attachment with the backend's
 *                                           file name (S9); open to people not invited or who
 *                                           have not agreed to the terms, as the backend
 *   POST /v1/accounts, POST /v1/accounts/mortgage-with-property, PATCH and DELETE /v1/accounts/:id
 *                                            bearer; the strict request bodies, If-Match on PATCH,
 *                                            applied as the backend does (account-writes.ts, S8)
 *   DELETE /v1/user-profile                  bearer; `{ confirmation: "DELETE" }`, a sign-in in the
 *                                           last 15 minutes (`auth_time`), then deletes: every
 *                                           later read answers 410 account_deleted and the login
 *                                           (its refresh tokens) is gone (S9)
 *   anything else under /v1                  404 not_found, so a missing fixture is loud
 *   The check-in routes and the budget ignore query strings (`?details=none`, `?limit=`) and answer 401,
 *   403 not_invited and 403 terms_not_accepted as the profile does.
 * Scenarios (POST /__fixture/scenario with a JSON patch; every reset restores the defaults):
 *   account  invited | not-invited          not-invited: /v1 answers 403 not_invited
 *   signIn   ok | denied                    denied: authorize returns error=access_denied
 *   refresh  ok | rejected | unavailable    every refresh invalid_grant, or 503
 *   accessTokenSeconds, minVersion          token lifetime; the client policy's minimum version
 *   data     ok | unavailable | empty       the check-in routes: canned data, 503
 *            | owner | renter | malformed   service_unavailable, or no accounts and no months;
 *            | joint | twoMonths             joint: a joint 50% mortgage and home and an overdrawn
 *                                           current account; twoMonths: two recorded months (S6);
 *                                           owner and renter: personas.ts's home-owning and
 *                                           renting households with six recorded months (S5);
 *                                           malformed: the ok data with one account's balance
 *                                           missing from GET /accounts (out of step)
 *            | renter-linked | scottish-refused  Home's strip (S5b), all on the renter's accounts:
 *            | no-budget | pension-only     the income line linked to take-home pay; the same in
 *                                           Scotland (refused once the device's date is in
 *                                           2027/28, which has no Scottish rates); no budget; and
 *                                           no debts (the credit card and student loan left out)
 *   backend  current | older | newer        the profile as a backend from before E35 sends it (no
 *                                           `wellbeingQuestions`), or with a field from a later one
 *   terms    agreed | required              required: authenticated /v1 answers 403
 *                                           terms_not_accepted (PR #939), after not_invited
 *   profile  set-up | not-set-up | none     not-set-up: onboardingCompleted false; none: the
 *                                           profile answers 200 with no body (no profile yet)
 *   export   ok | rate-limited              the export answers 429 (S9)
 *   deletion ok | recent-login              the delete answers deleted; 403 recent_login_required
 *            | identity-pending             until a new sign-in; identity_pending once, then
 *            | unavailable | rate-limited    deleted; 503 account_deletion_unavailable; 429 (S9)
 *   signInAs fixture | other                other: the next sign-ins are a different person (a
 *                                           different `sub`), for the re-authentication (S9)
 * Issued access tokens carry `auth_time`, the sign-in time, unchanged by refreshes (S9).
 * Control (flows set the scenario before they launch the app):
 *   POST /__fixture/scenario, POST /__fixture/revoke, POST /__fixture/reset (also rebuilds the
 *   check-in data), GET /__fixture/stats (with `?signOutsAtLeast=N` it first waits, up to 10
 *   seconds, for that many server sign-outs: the app shows the sign-in screen before its sign-out
 *   call lands, so a flow must not read the count at once; counts, PUTs without `checkIn: true`, the check-in
 *   months, the current London month, the sign-outs and the last authorize's `max_age`)
 *
 * Refresh tokens are replaced on every use. As real WorkOS does (workos.com/docs/authkit/
 * session-resilience, read 26 November 2026; seen on the owner's devices), a used token sent again
 * within 30 seconds returns the same new pair, and is refused with `invalid_grant` after that.
 */
import { createHash, randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import {
  type BudgetEntryListResponse,
  CreateAccountRequest,
  CreateBudgetEntryRequest,
  CreateMortgageWithPropertyRequest,
  etagFor,
  SnapshotMonth,
  UpdateAccountRequest,
  UpdateBudgetEntryRequest,
  UpdateProfileRequest,
  UpsertSnapshotRequest,
  type UserProfileResponse,
} from "@flump/api-contract";
import {
  createAccount,
  createMortgageWithProperty,
  deleteAccount,
  updateAccount,
} from "./account-writes";
import {
  applySnapshot,
  buildCheckInStore,
  type CheckInStore,
  type CheckInStoreKind,
  cannedAccountDetails,
  cannedAccounts,
  cannedBudgetEntries,
  cannedCheckIns,
  cannedClientPolicy,
  cannedProfile,
  FIXTURE_PERSON,
  HOMEOWNER_BUDGET,
  HOMEOWNER_FACTS,
  londonMonth,
  malformedAccounts,
  type PersonaBudgetRow,
  RENTER_BUDGET,
  RENTER_FACTS,
} from "./fixtures";
import { newSigningKey, opaque, publicJwk, type SigningKey, signJwt, verifyJwt } from "./tokens";

/** The port flows and the `e2e` build profile use. The production bundle must not contain it. */
export const FIXTURE_PORT = 8787;
/** The Android emulator's name for the computer it runs on. */
export const EMULATOR_HOST = "10.0.2.2";
/** The app's sign-in redirect (plan section 5.2, owner step OS1 registers it with real WorkOS). */
const APP_REDIRECT = "flump://auth/callback";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

const CODE_LIFETIME_MS = 10 * 60 * 1000;
/** WorkOS's refresh token grace period: "The grace period is 30 seconds." */
const REFRESH_GRACE_MS = 30 * 1000;
/** How long a stats request waits for an expected sign-out (real time: the app's call is real). */
const SIGN_OUT_WAIT_MS = 10 * 1000;

/** The `data` scenarios. */
const DATA_SCENARIOS = [
  "ok",
  "unavailable",
  "empty",
  "owner",
  "renter",
  "malformed",
  "renter-linked",
  "scottish-refused",
  "no-budget",
  "pension-only",
  "joint",
  "twoMonths",
] as const;
type DataScenario = (typeof DATA_SCENARIOS)[number];

/**
 * What a data scenario's household holds beyond its accounts: which store, its budget (with the
 * income line linked to take-home pay or not) and the profile answers laid over the canned ones.
 */
const HOUSEHOLDS: Record<
  Exclude<DataScenario, "unavailable">,
  {
    store: CheckInStoreKind;
    budget: readonly PersonaBudgetRow[];
    linkTakeHome?: boolean;
    facts?: Partial<UserProfileResponse>;
  }
> = {
  ok: { store: "ok", budget: [] },
  malformed: { store: "ok", budget: [] },
  empty: { store: "empty", budget: [] },
  owner: { store: "owner", budget: HOMEOWNER_BUDGET, facts: HOMEOWNER_FACTS },
  renter: { store: "renter", budget: RENTER_BUDGET, facts: RENTER_FACTS },
  "renter-linked": {
    store: "renter",
    budget: RENTER_BUDGET,
    linkTakeHome: true,
    facts: RENTER_FACTS,
  },
  "scottish-refused": {
    store: "renter",
    budget: RENTER_BUDGET,
    linkTakeHome: true,
    facts: { ...RENTER_FACTS, taxRegion: "SCOTLAND" },
  },
  "no-budget": { store: "renter", budget: [], facts: RENTER_FACTS },
  "pension-only": { store: "pension-only", budget: RENTER_BUDGET, facts: RENTER_FACTS },
  joint: { store: "joint", budget: [] },
  twoMonths: { store: "twoMonths", budget: [] },
};

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
  /**
   * The check-in routes: canned data, 503 service_unavailable, no accounts at all, a persona's
   * household (Home, S5), or the canned data with an account missing its balance.
   */
  data: DataScenario;
  /** `required`: authenticated `/v1` answers 403 terms_not_accepted until the terms are agreed. */
  terms: "agreed" | "required";
  /**
   * Version skew (PR #951): `older` leaves out `wellbeingQuestions`, which a backend from before
   * E35 W5 does not send; `newer` adds a field the app has never heard of.
   */
  backend: "current" | "older" | "newer";
  /** A person who has not finished setup on the website, or has no profile at all yet. */
  profile: "set-up" | "not-set-up" | "none";
  /** The export: the file, or 429 (S9). */
  export: "ok" | "rate-limited";
  /** The delete's answer (S9); see the header comment. */
  deletion: "ok" | "recent-login" | "identity-pending" | "unavailable" | "rate-limited";
  /** `other`: sign-ins from now are a different person, for the re-authentication (S9). */
  signInAs: "fixture" | "other";
}

const DEFAULT_SCENARIO: Scenario = {
  account: "invited",
  signIn: "ok",
  refresh: "ok",
  accessTokenSeconds: 300,
  minVersion: "0.0.0",
  data: "ok",
  terms: "agreed",
  backend: "current",
  profile: "set-up",
  export: "ok",
  deletion: "ok",
  signInAs: "fixture",
};

const ALLOWED: { [K in keyof Scenario]: (v: unknown) => boolean } = {
  account: (v) => v === "invited" || v === "not-invited",
  signIn: (v) => v === "ok" || v === "denied",
  refresh: (v) => v === "ok" || v === "rejected" || v === "unavailable",
  accessTokenSeconds: (v) => typeof v === "number" && Number.isInteger(v) && v >= 0,
  minVersion: (v) => typeof v === "string" && /^\d{1,5}(\.\d{1,5}){0,2}$/.test(v),
  data: (v) => (DATA_SCENARIOS as readonly unknown[]).includes(v),
  terms: (v) => v === "agreed" || v === "required",
  backend: (v) => v === "current" || v === "older" || v === "newer",
  profile: (v) => v === "set-up" || v === "not-set-up" || v === "none",
  export: (v) => v === "ok" || v === "rate-limited",
  deletion: (v) =>
    v === "ok" ||
    v === "recent-login" ||
    v === "identity-pending" ||
    v === "unavailable" ||
    v === "rate-limited",
  signInAs: (v) => v === "fixture" || v === "other",
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
  /** `POST /v1/session/sign-out` requests that revoked a session. */
  signOuts: number;
  /** Export files served (S9). */
  exports: number;
  /** Deletions that removed the login (S9). */
  deletions: number;
  /** Account adds, changes and deletes that were applied (S8). */
  accountWrites: number;
  /** Budget writes that changed the saved budget: adds, edits and deletes (S10). */
  budgetWrites: number;
}

interface FixtureStats extends FixtureCounts {
  latestStartedMonth: string | null;
  latestCompletedMonth: string | null;
  /** The London month of the server's clock: the month a check-in now writes. */
  currentMonth: string;
  /** The `max_age` of the last authorize request, or null when it had none (or none yet). */
  lastAuthorizeMaxAge: string | null;
  /** True once a delete answered `deleted` or `identity_pending` (S9). */
  erased: boolean;
}

const ZERO_COUNTS: FixtureCounts = {
  exchanges: 0,
  refreshes: 0,
  apiRequests: 0,
  snapshotPuts: 0,
  putsWithoutCheckIn: 0,
  signOuts: 0,
  exports: 0,
  deletions: 0,
  accountWrites: 0,
  budgetWrites: 0,
};

/** The backend's recent sign-in window for a deletion (`auth/recent-login.ts`). */
const RECENT_LOGIN_MS = 15 * 60 * 1000;

const CHECK_IN_ROUTES = new Set([
  "/accounts",
  "/account-details",
  "/snapshots/check-ins",
  "/budget-entries",
]);

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
  /**
   * The token signing key. Made fresh by default; tests pass one made once per file, because an
   * RSA key per test costs seconds of CPU on CI that other suites then wait for.
   */
  signingKey?: SigningKey;
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
  /** When this sign-in happened (its tokens' `auth_time`); refreshes keep it (S9). */
  authTimeMs: number;
}

export async function startFixtureServer(options: FixtureServerOptions): Promise<FixtureServer> {
  const now = options.now ?? Date.now;
  const host = options.host ?? "127.0.0.1";
  // Test tokens and a scenario switch must never be reachable from another machine.
  if (!LOOPBACK_HOSTS.has(host)) {
    throw new Error(`The fixture server listens on loopback only, not ${host}.`);
  }
  const redirectUris = new Set(options.redirectUris ?? [APP_REDIRECT]);
  const key = options.signingKey ?? newSigningKey();
  const userId = `user_${opaque(12)}`;
  /** A different person, for `signInAs: "other"` (S9). */
  const otherUserId = `user_${opaque(12)}`;

  /** The check-in data for each data scenario, rebuilt (with new ids) on every reset. */
  const buildStores = () => ({
    ok: buildCheckInStore(userId, new Date(now()), "ok"),
    empty: buildCheckInStore(userId, new Date(now()), "empty"),
    owner: buildCheckInStore(userId, new Date(now()), "owner"),
    renter: buildCheckInStore(userId, new Date(now()), "renter"),
    "pension-only": buildCheckInStore(userId, new Date(now()), "pension-only"),
    joint: buildCheckInStore(userId, new Date(now()), "joint"),
    twoMonths: buildCheckInStore(userId, new Date(now()), "twoMonths"),
  });

  /** The data scenario's household, or the canned data's while the data is unavailable. */
  const householdKey = () => (scenario.data === "unavailable" ? "ok" : scenario.data);
  const household = () => HOUSEHOLDS[householdKey()];
  /**
   * Each household's saved budget, with ids made once, so an edit or delete finds its row; writes
   * are kept until a reset (S10). Built now, so a contract change fails the start, not a flow.
   */
  const buildBudgets = () =>
    Object.fromEntries(
      Object.entries(HOUSEHOLDS).map(([key, h]) => [
        key,
        cannedBudgetEntries(userId, new Date(now()), h.budget, { linkTakeHome: h.linkTakeHome }),
      ]),
    ) as Record<keyof typeof HOUSEHOLDS, BudgetEntryListResponse>;
  for (const h of Object.values(HOUSEHOLDS)) cannedProfile(userId, new Date(now()), h.facts);
  cannedClientPolicy(DEFAULT_SCENARIO.minVersion);
  let stores = buildStores();
  let budgets = buildBudgets();

  let scenario: Scenario = { ...DEFAULT_SCENARIO };
  let counts: FixtureCounts = { ...ZERO_COUNTS };
  /** Profile changes saved by PATCH, and the profile's version: both kept until a reset (S9). */
  let profileEdits: UpdateProfileRequest = {};
  let profileUpdatedAt = new Date(now()).toISOString();
  let lastAuthorizeMaxAge: string | null = null;
  /** The account is erased (S9): reads answer 410 account_deleted. */
  let erased = false;
  /** `identity-pending` answers identity_pending once, then the repeat finishes the deletion. */
  let identityPendingSent = false;
  /** With `deletion: "recent-login"`, sign-ins before this moment are not recent enough. */
  let recentLoginAfter = 0;
  /** Stats requests waiting for the next sign-out. */
  const signOutWaiters: (() => void)[] = [];

  /** Resolves once `signOuts` reaches `target`, or after `SIGN_OUT_WAIT_MS` (the caller then fails). */
  async function untilSignOuts(target: number) {
    const deadline = Date.now() + SIGN_OUT_WAIT_MS;
    while (counts.signOuts < target && Date.now() < deadline) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, deadline - Date.now());
        timer.unref();
        signOutWaiters.push(() => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
  }
  const store = (): CheckInStore => stores[household().store];
  const stats = (): FixtureStats => ({
    ...counts,
    latestStartedMonth: store().latestStartedMonth,
    latestCompletedMonth: store().latestCompletedMonth,
    currentMonth: londonMonth(new Date(now())),
    lastAuthorizeMaxAge,
    erased,
  });
  const codes = new Map<string, PendingCode>();
  /** Refresh token to session. A used token moves to `spent`. */
  const refreshTokens = new Map<string, Session>();
  /** A used refresh token, the answer it got and when: replayed within the grace period. */
  const spent = new Map<string, { session: Session; body: unknown; usedAt: number }>();
  const sessions = new Map<string, Session>();
  let publicOrigin = options.publicOrigin ?? "";

  const issuer = () => `${publicOrigin}/user_management/${options.clientId}`;

  function issueTokens(session: Session) {
    const iat = Math.floor(now() / 1000);
    const accessToken = signJwt(key, {
      iss: issuer(),
      sub: session.userId,
      sid: session.id,
      auth_time: Math.floor(session.authTimeMs / 1000),
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

  /**
   * The signed-in session for a bearer token, or undefined (missing, forged, expired, revoked).
   * Stricter than real life: the backend checks access tokens locally, so after a revoke it still
   * accepts one until it expires (at most 300 seconds). Here a revoke ends them at once.
   */
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
    lastAuthorizeMaxAge = q.get("max_age");
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
      const session: Session = {
        id: `session_${opaque(12)}`,
        userId: scenario.signInAs === "other" ? otherUserId : userId,
        revoked: false,
        authTimeMs: now(),
      };
      sessions.set(session.id, session);
      return json(res, 200, issueTokens(session));
    }

    if (body.grant_type === "refresh_token") {
      counts.refreshes += 1;
      const session = refreshTokens.get(body.refresh_token ?? "");
      if (scenario.refresh === "unavailable") {
        return json(res, 503, { error: "service_unavailable" });
      }
      const token = body.refresh_token ?? "";
      if (scenario.refresh === "rejected") {
        refreshTokens.delete(token);
        return oauthError(res, 400, "invalid_grant");
      }
      const replay = spent.get(token);
      if (replay && !replay.session.revoked && now() - replay.usedAt < REFRESH_GRACE_MS) {
        return json(res, 200, replay.body);
      }
      refreshTokens.delete(token);
      if (!session || session.revoked) return oauthError(res, 400, "invalid_grant");
      const issued = issueTokens(session);
      spent.set(token, { session, body: issued, usedAt: now() });
      return json(res, 200, issued);
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
    if (erased) {
      apiError(res, 410, "account_deleted", "This account has been deleted.");
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
    if (req.method === "POST" && path === "/session/sign-out") {
      // As the backend: the session comes from the verified token only, and a person who is not
      // invited or has not agreed to the terms can still sign out.
      const session = sessionFor(req);
      if (!session) return apiError(res, 401, "unauthorized", "Sign in to continue.");
      session.revoked = true;
      counts.signOuts += 1;
      for (const wake of signOutWaiters.splice(0)) wake();
      return void res.writeHead(204).end();
    }
    if (req.method === "GET" && path === "/user-profile/export") return handleExport(req, res);
    if (req.method === "DELETE" && path === "/user-profile") return handleDelete(req, res);
    if (req.method === "GET" && path === "/user-profile") {
      const session = invitedSession(req, res);
      if (!session) return;
      const profile: Record<string, unknown> = {
        ...cannedProfile(session.userId, new Date(now()), household().facts),
        ...profileEdits,
        updatedAt: profileUpdatedAt,
      };
      if (scenario.backend === "older") delete profile.wellbeingQuestions;
      if (scenario.backend === "newer") profile.fieldFromALaterBackend = "something new";
      if (scenario.profile === "none") return void res.writeHead(200).end();
      if (scenario.profile === "not-set-up") profile.onboardingCompleted = false;
      return json(res, 200, profile);
    }
    if (req.method === "PATCH" && path === "/user-profile") {
      const session = invitedSession(req, res);
      if (!session) return;
      return handleProfilePatch(session, req, res);
    }
    const accountId = /^\/accounts\/([^/]+)$/.exec(path)?.[1];
    const isAccountWrite =
      (req.method === "POST" &&
        (path === "/accounts" || path === "/accounts/mortgage-with-property")) ||
      ((req.method === "PATCH" || req.method === "DELETE") &&
        accountId !== undefined &&
        accountId !== "mortgage-with-property");
    if (isAccountWrite) {
      const session = invitedSession(req, res);
      if (!session) return;
      if (scenario.data === "unavailable") {
        return apiError(res, 503, "service_unavailable", "The service is not available.");
      }
      return handleAccountWrite(path, accountId, session, req, res);
    }
    const budgetId = /^\/budget-entries\/([^/]+)$/.exec(path)?.[1];
    const isBudgetWrite =
      (req.method === "POST" && path === "/budget-entries") ||
      ((req.method === "PATCH" || req.method === "DELETE") && budgetId !== undefined);
    if (isBudgetWrite) {
      const session = invitedSession(req, res);
      if (!session) return;
      if (scenario.data === "unavailable") {
        return apiError(res, 503, "service_unavailable", "The service is not available.");
      }
      return handleBudgetWrite(session, budgetId ? decodeURIComponent(budgetId) : null, req, res);
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
      if (path === "/accounts") {
        if (scenario.data === "malformed") return json(res, 200, malformedAccounts(store()));
        return json(res, 200, cannedAccounts(store()));
      }
      if (path === "/account-details") return json(res, 200, cannedAccountDetails(store()));
      if (path === "/budget-entries") return json(res, 200, budgets[householdKey()]);
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

  /** The account writes, each body parsed with the contract's strict request schema first (S8). */
  async function handleAccountWrite(
    path: string,
    accountId: string | undefined,
    session: Session,
    req: IncomingMessage,
    res: ServerResponse,
  ) {
    const at = new Date(now());
    if (req.method === "DELETE") {
      counts.accountWrites += 1;
      return deleteAccount(store(), accountId ?? "")
        ? json(res, 200, { success: true })
        : apiError(res, 404, "not_found", "Account not found");
    }
    const raw = await readJson(req);
    if (raw === undefined) return apiError(res, 400, "invalid_json", "The body is not JSON.");
    const schema =
      req.method === "PATCH"
        ? UpdateAccountRequest
        : path === "/accounts"
          ? CreateAccountRequest
          : CreateMortgageWithPropertyRequest;
    const body = schema.safeParse(raw);
    if (!body.success) {
      const issues = body.error.issues.map((i) => ({
        path: ["body", ...i.path.map(String)].join("."),
        code: i.code,
        message: i.message,
      }));
      return apiError(res, 400, "validation_failed", "The request is not valid.", issues);
    }
    counts.accountWrites += 1;
    if (req.method === "PATCH") {
      const ifMatch = req.headers["if-match"];
      const result = updateAccount(
        store(),
        session.userId,
        accountId ?? "",
        body.data as UpdateAccountRequest,
        typeof ifMatch === "string" ? ifMatch : undefined,
        at,
      );
      if ("status" in result) return apiError(res, result.status, result.code, result.message);
      return json(res, 200, result);
    }
    if (path === "/accounts") {
      return json(
        res,
        201,
        createAccount(store(), session.userId, body.data as CreateAccountRequest, at),
      );
    }
    return json(
      res,
      201,
      createMortgageWithProperty(
        store(),
        session.userId,
        body.data as CreateMortgageWithPropertyRequest,
        at,
      ),
    );
  }

  /**
   * The budget's writes (S10), as the backend: the strict body first (a server-owned key such as
   * `isPrimaryIncome` is refused), then the row, then the version in If-Match when one is sent.
   */
  async function handleBudgetWrite(
    session: Session,
    id: string | null,
    req: IncomingMessage,
    res: ServerResponse,
  ) {
    const key = householdKey();
    const rows = budgets[key];
    const iso = () => new Date(now()).toISOString();
    if (req.method === "DELETE") {
      if (!rows.some((r) => r.id === id)) return apiError(res, 404, "not_found", "No such entry.");
      budgets = { ...budgets, [key]: rows.filter((r) => r.id !== id) };
      counts.budgetWrites += 1;
      return json(res, 200, { success: true });
    }
    const raw = await readJson(req);
    if (raw === undefined) return apiError(res, 400, "invalid_json", "The body is not JSON.");
    const parsed =
      req.method === "POST"
        ? CreateBudgetEntryRequest.safeParse(raw)
        : UpdateBudgetEntryRequest.safeParse(raw);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => ({
        path: ["body", ...i.path.map(String)].join("."),
        code: i.code,
        message: i.message,
      }));
      return apiError(res, 400, "validation_failed", "The request is not valid.", issues);
    }
    const body = parsed.data;
    if (req.method === "POST") {
      const row = {
        id: randomUUID(),
        userId: session.userId,
        category: body.category ?? "expenses",
        name: body.name ?? body.title ?? "",
        amount: body.linkKind ? 0 : (body.amount ?? 0),
        frequency: body.frequency ?? "monthly",
        isIncome: body.isIncome ?? false,
        isPrimaryIncome: false,
        isEssential: body.isEssential ?? false,
        notes: body.notes ?? null,
        isDefault: false,
        ownership: body.ownership ?? "sole",
        sharePercent: body.ownership === "joint" ? (body.sharePercent ?? 50) : null,
        linkKind: body.linkKind ?? null,
        linkAccountId: body.linkAccountId ?? null,
        createdAt: iso(),
        updatedAt: iso(),
      };
      budgets = { ...budgets, [key]: [...rows, row] };
      counts.budgetWrites += 1;
      return json(res, 200, row);
    }
    const current = rows.find((r) => r.id === id);
    if (!current) return apiError(res, 404, "not_found", "No such entry.");
    const ifMatch = req.headers["if-match"];
    if (ifMatch !== undefined && ifMatch !== etagFor(current.updatedAt)) {
      return apiError(res, 412, "precondition_failed", "The entry changed since it was read.");
    }
    const { title, ...fields } = body as typeof body & { title?: string };
    const next = {
      ...current,
      ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)),
      ...(title && !fields.name ? { name: title } : {}),
      // A new version, always later than the last, as the backend's updatedAt.
      updatedAt: new Date(Math.max(now(), Date.parse(current.updatedAt) + 1)).toISOString(),
    };
    budgets = { ...budgets, [key]: rows.map((r) => (r.id === id ? next : r)) };
    counts.budgetWrites += 1;
    return json(res, 200, next);
  }

  /** As the backend: the strict body first, then the version in If-Match when one is sent. */
  async function handleProfilePatch(session: Session, req: IncomingMessage, res: ServerResponse) {
    const raw = await readJson(req);
    if (raw === undefined) return apiError(res, 400, "invalid_json", "The body is not JSON.");
    const body = UpdateProfileRequest.safeParse(raw);
    if (!body.success) {
      const issues = body.error.issues.map((i) => ({
        path: ["body", ...i.path.map(String)].join("."),
        code: i.code,
        message: i.message,
      }));
      return apiError(res, 400, "validation_failed", "The request is not valid.", issues);
    }
    const ifMatch = req.headers["if-match"];
    if (ifMatch !== undefined && ifMatch !== etagFor(profileUpdatedAt)) {
      return apiError(res, 412, "precondition_failed", "The profile changed since it was read.");
    }
    profileEdits = { ...profileEdits, ...body.data };
    // A new version, always later than the last, as the backend's updatedAt.
    const previous = Date.parse(profileUpdatedAt);
    profileUpdatedAt = new Date(Math.max(now(), previous + 1)).toISOString();
    return json(res, 200, {
      ...cannedProfile(session.userId, new Date(now())),
      ...profileEdits,
      updatedAt: profileUpdatedAt,
    });
  }

  /**
   * The export (S9): as the backend, open to a person who is not invited or has not agreed to the
   * terms (`@AllowUninvited`, `@AllowWithoutTerms`), but not to an erased account.
   */
  function handleExport(req: IncomingMessage, res: ServerResponse) {
    const session = sessionFor(req);
    if (!session) return apiError(res, 401, "unauthorized", "Sign in to continue.");
    if (erased) return apiError(res, 410, "account_deleted", "This account has been deleted.");
    if (scenario.export === "rate-limited") {
      return apiError(res, 429, "rate_limited", "Too many requests. Try again later.");
    }
    counts.exports += 1;
    const today = new Date(now()).toISOString().slice(0, 10);
    const body = {
      exportedAt: new Date(now()).toISOString(),
      profile: { email: FIXTURE_PERSON.email, firstName: FIXTURE_PERSON.firstName },
      accounts: cannedAccounts(store()),
    };
    res
      .writeHead(200, {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="flump-export-${today}.json"`,
        "cache-control": "no-store",
      })
      .end(JSON.stringify(body));
  }

  /**
   * The deletion (S9), in the backend's order: a signed-in caller (erased, uninvited and
   * terms-refusing accounts included), the typed phrase, the rate limit, a recent sign-in, then
   * the erase. `deleted` removes the login: every session is revoked, so refreshes are refused.
   */
  async function handleDelete(req: IncomingMessage, res: ServerResponse) {
    const session = sessionFor(req);
    if (!session) return apiError(res, 401, "unauthorized", "Sign in to continue.");
    const raw = await readJson(req);
    const confirmation =
      typeof raw === "object" && raw !== null && "confirmation" in raw ? raw.confirmation : null;
    if (confirmation !== "DELETE") {
      return apiError(res, 400, "validation_failed", "Type DELETE to confirm.");
    }
    if (scenario.deletion === "rate-limited") {
      return apiError(res, 429, "rate_limited", "Too many requests. Try again later.");
    }
    const recent =
      now() - session.authTimeMs <= RECENT_LOGIN_MS && session.authTimeMs >= recentLoginAfter;
    if (!recent) {
      return apiError(
        res,
        403,
        "recent_login_required",
        "For your security, sign in again, then try again.",
      );
    }
    if (scenario.deletion === "unavailable") {
      return apiError(
        res,
        503,
        "account_deletion_unavailable",
        "Account deletion is not available right now. Try again later.",
      );
    }
    erased = true;
    if (scenario.deletion === "identity-pending" && !identityPendingSent) {
      identityPendingSent = true;
      return json(res, 200, { status: "identity_pending" });
    }
    counts.deletions += 1;
    for (const each of sessions.values()) if (each.userId === session.userId) each.revoked = true;
    refreshTokens.clear();
    spent.clear();
    return json(res, 200, { status: "deleted" });
  }

  /** A sign-in made before a `recent-login` scenario is set is no longer recent (S9). */
  function noteScenario(patch: Partial<Scenario>) {
    if (patch.deletion === "recent-login") recentLoginAfter = now() + 1;
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
    if (path.startsWith("/v1/")) return handleV1(path.slice("/v1".length), req, res);

    if (req.method === "POST" && path === "/__fixture/scenario") {
      const patch = parseScenarioPatch(await readJson(req));
      if (!patch) return json(res, 400, { error: "unknown scenario key or value" });
      scenario = { ...scenario, ...patch };
      noteScenario(patch);
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
    if (req.method === "GET" && path === "/__fixture/stats") {
      const wanted = Number(url.searchParams.get("signOutsAtLeast") ?? "0");
      if (Number.isInteger(wanted) && wanted > 0) await untilSignOuts(wanted);
      return json(res, 200, stats());
    }

    return json(res, 404, { error: "not_found" });
  }

  function reset() {
    scenario = { ...DEFAULT_SCENARIO };
    counts = { ...ZERO_COUNTS };
    stores = buildStores();
    budgets = buildBudgets();
    profileEdits = {};
    profileUpdatedAt = new Date(now()).toISOString();
    codes.clear();
    refreshTokens.clear();
    spent.clear();
    sessions.clear();
    lastAuthorizeMaxAge = null;
    erased = false;
    identityPendingSent = false;
    recentLoginAfter = 0;
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
      noteScenario(checked);
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
