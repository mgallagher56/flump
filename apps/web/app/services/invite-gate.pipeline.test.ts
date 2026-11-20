// @vitest-environment node
import {
  createStaticHandler,
  RouterContextProvider,
  type StaticHandlerContext,
} from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The global test setup stubs parts of react-router; this test needs the real static handler.
vi.mock("react-router", async () => await vi.importActual("react-router"));
vi.mock("~/utils/auth.server", () => ({ getAuthSession: vi.fn() }));
vi.mock("./beta-mode.server", () => ({ isInviteOnly: vi.fn() }));

import { getAuthSession } from "~/utils/auth.server";
import { isInviteOnly } from "./beta-mode.server";
import { inviteGateMiddleware } from "./invite-gate.server";

/**
 * Runs a full page load through React Router's real server pipeline (middleware, loaders, error
 * bubbling), as the app's request handler does, and returns what would be rendered and serialised.
 */
const SECRET = "Joint savings 1200";
const childLoader = vi.fn(() => ({ accounts: SECRET }));
const rootLoader = vi.fn(() => ({ user: { id: "user_x" } }));

async function pageLoad(path: string) {
  const handler = createStaticHandler([
    {
      id: "root",
      path: "/",
      // The server pipeline types middleware for any result; the app's returns a Response.
      middleware: [inviteGateMiddleware as never],
      loader: rootLoader,
      hasErrorBoundary: true,
      children: [{ id: "accounts", path: "app/accounts", loader: childLoader }],
    },
  ]);
  const request = new Request(`http://localhost${path}`);
  let context: StaticHandlerContext | null = null;
  const response = await handler.query(request, {
    requestContext: new RouterContextProvider(),
    generateMiddlewareResponse: async (query) => {
      const result = await query(request);
      if (result instanceof Response) return result;
      context = result;
      return new Response(JSON.stringify({ loaderData: result.loaderData }), {
        status: result.statusCode,
      });
    },
  });
  return { response: response as Response, context: context as StaticHandlerContext | null };
}

const realFetch = globalThis.fetch;

describe("invite gate in the real React Router pipeline", () => {
  beforeEach(() => {
    vi.mocked(getAuthSession).mockResolvedValue({
      user: { id: "user_x" },
      accessToken: "tok",
      headers: undefined,
    } as never);
    vi.mocked(isInviteOnly).mockResolvedValue(true);
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.clearAllMocks();
  });

  it("renders the root boundary with no loader data for an uninvited page load", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ statusCode: 403, error: "not_invited" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }),
    ) as typeof fetch;
    const { response, context } = await pageLoad("/app/accounts");
    expect(response.status).toBe(403);
    expect(childLoader).not.toHaveBeenCalled();
    expect(rootLoader).not.toHaveBeenCalled();
    expect(context?.loaderData).toEqual({});
    expect(context?.errors?.root).toMatchObject({ status: 403, data: { kind: "not-invited" } });
    expect(await response.text()).not.toContain(SECRET);
  });

  it("runs every loader for an invited page load", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    ) as typeof fetch;
    const { response } = await pageLoad("/app/accounts");
    expect(response.status).toBe(200);
    expect(childLoader).toHaveBeenCalledOnce();
    expect(await response.text()).toContain(SECRET);
  });
});
