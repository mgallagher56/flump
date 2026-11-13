import fs from "node:fs";
import path from "node:path";
import { inspect } from "node:util";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * E20-N8: the access token must never reach the browser.
 *
 * (1) Source ratchet: no browser-reachable file mentions `accessToken` except the allow-list.
 * (2) Loader sweep: every route module's `loader` is run with a session whose token is a
 *     sentinel, and the serialised result must not contain it.
 */

// The global test setup stubs parts of react-router; loaders need the real `data` and `redirect`.
vi.mock("react-router", async () => await vi.importActual("react-router"));

// Built at runtime so no secret-looking literal sits in the source (gitleaks scans every commit).
const SENTINEL = ["n8", "sentinel", "access", "token", String(Date.now())].join("-");

const getAuthSession = vi.fn();
vi.mock("~/utils/auth.server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/utils/auth.server")>()),
  getAuthSession: (...a: unknown[]) => getAuthSession(...a),
}));
vi.mock("~/i18n.server", () => ({ default: { getLocale: vi.fn().mockResolvedValue("en") } }));
vi.mock("@workos-inc/authkit-react-router", () => ({
  authLoader: () => async () => new Response(null, { status: 302, headers: { Location: "/app" } }),
  configure: vi.fn(),
  getSignInUrl: async () => "https://auth.example.test/sign-in",
  getSignUpUrl: async () => "https://auth.example.test/sign-up",
  signOut: vi.fn(),
  authkitLoader: vi.fn(),
}));

const APP_DIR = path.resolve(__dirname, "..");

// --- (1) source ratchet ---------------------------------------------------------------------

/**
 * Browser-reachable files that may still mention `accessToken`. Every entry is debt with an owner.
 * - MortgageContainer.tsx reads `accessToken` from root loader data (now always undefined) and
 *   passes it on. E20-N9 removes it.
 * - api-client.ts keeps the deprecated, ignored optional `accessToken` option so that call site
 *   still compiles. E20-N9 removes it together with MortgageContainer.
 * - AddEditAccountsDialog.tsx and ConnectBankWizard.tsx only contain the placeholder text for the
 *   bank provider token a user pastes in themselves ("Bearer token starting with eyJ...").
 *   It is not the Flump session token and no code reads it from the session.
 */
const ACCESS_TOKEN_ALLOW_LIST = [
  "components/dialogs/addEditAccountsDialog/AddEditAccountsDialog.tsx",
  "components/dialogs/connectBankWizard/ConnectBankWizard.tsx",
  "containers/mortgage/MortgageContainer.tsx",
  "services/api-client.ts",
];

const walk = (dir: string, files: string[] = []): string[] => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules") walk(full, files);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
};

const isServerOrTest = (file: string) =>
  /\.server\.(ts|tsx)$/.test(file) || /\.(test|spec|stories)\.(ts|tsx)$/.test(file);

/**
 * Route modules and root hold loaders and actions whose tokens stay on the server (React Router
 * strips them from the client bundle). They are covered by the loader sweep below, not by this
 * textual ratchet.
 */
const isServerEntry = (rel: string) => rel === "root.tsx" || rel.startsWith("routes/");

/** Token-like identifiers, case-insensitive, so `session.accessToken`-style aliases are caught. */
const TOKEN_IDENTIFIER = /accessToken|access_token|bearer/i;

const filesMentioningAccessToken = (): string[] =>
  walk(APP_DIR)
    .filter((file) => !isServerOrTest(file))
    .map((file) => path.relative(APP_DIR, file).split(path.sep).join("/"))
    .filter((rel) => !isServerEntry(rel))
    .filter((rel) => TOKEN_IDENTIFIER.test(fs.readFileSync(path.join(APP_DIR, rel), "utf8")))
    .sort();

describe("no access token in browser-reachable source", () => {
  it("only the allow-listed files mention a token identifier", () => {
    expect(filesMentioningAccessToken()).toEqual([...ACCESS_TOKEN_ALLOW_LIST].sort());
  });

  it("the allow-list holds no stale entries", () => {
    for (const rel of ACCESS_TOKEN_ALLOW_LIST) {
      expect(fs.readFileSync(path.join(APP_DIR, rel), "utf8")).toMatch(TOKEN_IDENTIFIER);
    }
  });
});

// --- (2) loader sweep -----------------------------------------------------------------------

type Loader = (args: unknown) => unknown;
type RouteModule = { loader?: Loader };

const routeModules = import.meta.glob<RouteModule>(
  ["../routes/*.ts", "../routes/*.tsx", "!../routes/*.test.*", "!../routes/*.stories.*"],
  { eager: true },
);
const modules: Record<string, RouteModule> = {
  "root.tsx": (await import("../root")) as unknown as RouteModule,
  ...Object.fromEntries(
    Object.entries(routeModules).map(([key, mod]) => [key.replace("../", ""), mod]),
  ),
};

/**
 * Loaders that cannot be exercised generically, each with the reason. Never skipped silently.
 * Empty today: every loader is run on the happy-path fixtures below.
 */
const NOT_EXERCISED: Record<string, string> = {};

/**
 * Loaders that legitimately THROW on the happy-path fixtures (their success path does not exist
 * or is not reachable generically). Their thrown value is still scanned for the sentinel. A loader
 * not listed here must return; a listed loader that stops throwing is a stale entry and fails.
 */
const ERROR_PATH_ONLY: Record<string, string> = {
  "routes/$.tsx": "catch-all route: its loader always throws a 404 Response",
};

/** Realistic per-endpoint backend fixtures (shapes the existing loader tests use). */
const profileFixture = {
  id: "p1",
  onboardingCompleted: true,
  enabledPages: ["accounts", "budget"],
  taxYear: "2025/26",
  grossIncome: 45000,
};
const accountFixture = {
  id: "a1",
  name: "Current",
  type: "Current",
  balance: 1000,
  details: [],
};
const backendFixture = (endpoint: string): unknown => {
  if (endpoint === "/accounts" || endpoint === "/account-details") {
    return endpoint === "/accounts" ? [accountFixture] : [];
  }
  if (/^\/accounts\/[^/]+$/.test(endpoint)) return accountFixture;
  if (endpoint === "/user-profile") return profileFixture;
  if (endpoint === "/bank-connections/capability") return { enabled: false };
  if (endpoint === "/portfolio-snapshot") return null;
  if (["/budget-entries", "/tax-records", "/bank-connections"].includes(endpoint)) return [];
  return {};
};

/** Serialises whatever a loader returned or threw the way a page could expose it. */
async function serialise(value: unknown): Promise<string> {
  const parts: string[] = [];
  if (value instanceof Response) {
    parts.push(String(value.status), JSON.stringify([...value.headers.entries()]));
    parts.push(await value.clone().text());
  } else {
    try {
      parts.push(JSON.stringify(value));
    } catch {
      // Circular or BigInt values still get inspected below.
    }
    parts.push(inspect(value, { depth: null, showHidden: false }));
    const init = (value as { init?: { headers?: HeadersInit } } | null)?.init;
    if (init?.headers) parts.push(JSON.stringify([...new Headers(init.headers).entries()]));
  }
  return parts.join("\n");
}

interface Outcome {
  serialised: string;
  threw: boolean;
}

async function runLoader(loader: Loader, url: string): Promise<Outcome> {
  const args = {
    request: new Request(url, { headers: { "x-flump-request": "1", origin: new URL(url).origin } }),
    params: {
      account: "a1",
      slug: "uk-100k-tax-trap-calculator",
      feature: "accounts",
      "*": "accounts",
    },
    context: {},
  };
  try {
    return { serialised: await serialise(await loader(args)), threw: false };
  } catch (error) {
    return { serialised: await serialise(error), threw: true };
  }
}

const urlFor = (key: string) => {
  if (key === "root.tsx") return "http://localhost/";
  if (key.startsWith("routes/api.")) return "http://localhost/api/accounts";
  if (key === "routes/callback.tsx") return "http://localhost/callback?code=abc";
  const base = key
    .replace(/^routes\//, "")
    .replace(/\.(ts|tsx)$/, "")
    .replace(/\._index$/, "");
  return `http://localhost/${base.replace(/\./g, "/")}`;
};

describe("loader data never contains the access token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthSession.mockResolvedValue({
      user: { id: "u1", email: "u@example.test" },
      accessToken: SENTINEL,
      headers: undefined,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const { pathname } = new URL(input instanceof Request ? input.url : String(input));
        return new Response(JSON.stringify(backendFixture(pathname)), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  const withLoader = Object.entries(modules).filter(([, mod]) => typeof mod.loader === "function");

  it("finds the loaders it is meant to sweep", () => {
    // Guards against the glob silently matching nothing.
    expect(withLoader.length).toBeGreaterThanOrEqual(15);
    const keys = withLoader.map(([key]) => key);
    expect(keys).toContain("root.tsx");
    expect(keys).toContain("routes/app.onboarding.tsx");
  });

  it("lists every non-exercised loader with a reason", () => {
    for (const [key, reason] of Object.entries(NOT_EXERCISED)) {
      expect(modules[key]?.loader, `${key} is listed but has no loader`).toBeTypeOf("function");
      expect(reason.length).toBeGreaterThan(10);
    }
  });

  for (const [key, mod] of withLoader) {
    if (key in NOT_EXERCISED) continue;
    it(`${key} does not serialise the token`, async () => {
      const { serialised, threw } = await runLoader(mod.loader as Loader, urlFor(key));
      expect(serialised).not.toContain(SENTINEL);
      // The success return is only checked if the loader reaches it.
      if (key in ERROR_PATH_ONLY) {
        expect(threw, `${key} is in ERROR_PATH_ONLY but no longer throws: remove it`).toBe(true);
      } else {
        expect(threw, `${key} threw on the happy path: ${serialised.slice(0, 300)}`).toBe(false);
      }
    });
  }

  it("lists every ERROR_PATH_ONLY loader with a reason", () => {
    for (const [key, reason] of Object.entries(ERROR_PATH_ONLY)) {
      expect(modules[key]?.loader, `${key} is listed but has no loader`).toBeTypeOf("function");
      expect(reason.length).toBeGreaterThan(10);
    }
  });

  it("the sweep really authenticates: the root loader sends the sentinel to the backend", async () => {
    const { threw } = await runLoader(modules["root.tsx"].loader as Loader, "http://localhost/");
    expect(threw).toBe(false);
    expect(getAuthSession).toHaveBeenCalled();
    const calls = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
    const sent = JSON.stringify(calls.map((call) => (call[1] as RequestInit | undefined)?.headers));
    expect(sent).toContain(SENTINEL);
  });
});

describe("positive control", () => {
  beforeEach(() => {
    getAuthSession.mockResolvedValue({ user: { id: "u1" }, accessToken: SENTINEL });
  });

  it("detects a loader that returns the token in its data", async () => {
    const leaking: Loader = async () => {
      const { accessToken } = await getAuthSession();
      return { user: { id: "u1" }, accessToken };
    };
    expect((await runLoader(leaking, "http://localhost/")).serialised).toContain(SENTINEL);
  });

  it("detects a loader that throws the token inside an error", async () => {
    const leaking: Loader = async () => {
      const { accessToken } = await getAuthSession();
      throw new Error(`failed with ${accessToken}`);
    };
    expect((await runLoader(leaking, "http://localhost/")).serialised).toContain(SENTINEL);
  });

  it("detects a loader that returns the token in a Response header", async () => {
    const leaking: Loader = async () => {
      const { accessToken } = await getAuthSession();
      return new Response("ok", { headers: { "x-leak": accessToken } });
    };
    expect((await runLoader(leaking, "http://localhost/")).serialised).toContain(SENTINEL);
  });

  it("detects a loader that leaks only in its success return while its error path is clean", async () => {
    const leaking: Loader = async (args) => {
      const { accessToken } = await getAuthSession();
      const { request } = args as { request: Request };
      if (new URL(request.url).searchParams.has("fail")) throw new Error("clean failure");
      return { ok: true, nested: { deep: [accessToken] } };
    };
    const failed = await runLoader(leaking, "http://localhost/?fail=1");
    expect(failed.threw).toBe(true);
    expect(failed.serialised).not.toContain(SENTINEL);
    const happy = await runLoader(leaking, "http://localhost/");
    expect(happy.threw).toBe(false);
    expect(happy.serialised).toContain(SENTINEL);
  });
});
