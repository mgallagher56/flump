// @vitest-environment node
import { type EntryContext, RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { nonceContext } from "./security/csp.server";

// The real root document (App and its ErrorBoundary) rendered through the real `handleRequest`,
// so the nonce travels middleware context -> NonceProvider -> root.tsx scripts exactly as in
// production. Only the router shell (ServerRouter) is replaced by a data-router stub, because
// building a full framework EntryContext by hand adds nothing to this check.
const mocks = vi.hoisted(() => ({ mode: "app" as "app" | "error" }));

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    ServerRouter: () => {
      const Stub = actual.createRoutesStub([
        mocks.mode === "app"
          ? {
              id: "root",
              path: "/",
              Component: App,
              loader: () => null,
            }
          : {
              id: "root",
              path: "/",
              Component: () => null,
              ErrorBoundary,
              loader: () => null,
            },
      ]);
      return (
        <Stub
          initialEntries={["/"]}
          hydrationData={
            mocks.mode === "app"
              ? {
                  loaderData: {
                    root: {
                      locale: "en",
                      user: null,
                      userProfile: null,
                      isMobileClient: false,
                      ENV: { SENTRY_DSN: "", SENTRY_ENVIRONMENT: "", SENTRY_RELEASE: "" },
                    },
                  },
                }
              : { errors: { root: new Error("boom") } }
          }
        />
      );
    },
  };
});
vi.mock("react-i18next", async () => await vi.importActual("react-i18next"));
vi.mock("./utils/auth.server", () => ({ getAuthSession: vi.fn() }));

import handleRequest from "./entry.server";
import App, { ErrorBoundary } from "./root";

/** Every `<script ...>` opening tag in `html` that has no `nonce` attribute. */
function scriptsWithoutNonce(html: string): string[] {
  const tags = html.match(/<script\b[^>]*>/gi) ?? [];
  return tags.filter((tag) => !/\snonce=("[^"]*"|'[^']*')/i.test(tag));
}

async function renderDocument(nonce: string): Promise<string> {
  const loadContext = new RouterContextProvider();
  loadContext.set(nonceContext, nonce);
  const response = (await handleRequest(
    new Request("http://localhost/", { headers: { "user-agent": "Googlebot" } }),
    200,
    new Headers(),
    {} as EntryContext,
    loadContext,
  )) as Response;
  return await response.text();
}

describe("scriptsWithoutNonce (positive control)", () => {
  it("detects a script without a nonce", () => {
    expect(scriptsWithoutNonce('<script nonce="a">1</script><script>2</script>')).toEqual([
      "<script>",
    ]);
    expect(scriptsWithoutNonce('<script src="/x.js"></script>')).toHaveLength(1);
  });

  it("accepts scripts that all carry one", () => {
    expect(scriptsWithoutNonce('<script nonce="a">1</script><script src="/x" nonce="b">')).toEqual(
      [],
    );
  });
});

describe("SSR document nonce coverage (E20-N11)", () => {
  it("puts the nonce on every script in the root document", async () => {
    mocks.mode = "app";
    const html = await renderDocument("nonce-for-app");
    const scripts = html.match(/<script\b[^>]*>/gi) ?? [];
    // window.ENV, theme init, ScrollRestoration (+ RR's own inline scripts).
    expect(scripts.length).toBeGreaterThanOrEqual(3);
    expect(scriptsWithoutNonce(html)).toEqual([]);
    for (const tag of scripts) expect(tag).toContain('nonce="nonce-for-app"');
    expect(html).toContain("window.ENV");
    expect(html).toContain("flump-theme");
  });

  it("puts the nonce on every script in the root ErrorBoundary document", async () => {
    mocks.mode = "error";
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const html = await renderDocument("nonce-for-error");
    const scripts = html.match(/<script\b[^>]*>/gi) ?? [];
    expect(scripts.length).toBeGreaterThanOrEqual(2);
    expect(scriptsWithoutNonce(html)).toEqual([]);
    expect(html).toContain("flump-theme");
  });
});
