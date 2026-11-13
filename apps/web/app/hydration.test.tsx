import { createInstance, type i18n as I18n } from "i18next";
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { I18nextProvider, initReactI18next, useTranslation } from "react-i18next";
import { getInitialNamespaces } from "remix-i18next/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18nOptions from "./i18n";
import { NonceProvider } from "./security/nonce";

vi.mock("./i18n.server", () => ({
  default: { getLocale: vi.fn(async () => "en"), getRouteNamespaces: vi.fn(() => ["common"]) },
}));
vi.mock("./utils/auth.server", () => ({ getAuthSession: vi.fn() }));
vi.mock("react-i18next", async () => await vi.importActual("react-i18next"));

import * as rootModule from "./root";

// React #418 on /tools and /sandbox (E20-N11 follow-up). Root cause: the shell (Header, footer) uses
// the `common` i18n namespace, but only a few routes declared `handle.i18n`. remix-i18next picks the
// namespaces to preload from route handles on both sides, so on every other route the server (sync
// fs backend) rendered "Home" while the client (async http backend) rendered the key "home" before
// `common.json` arrived. This test hydrates real server markup with the real development React build
// and the real client namespace derivation, and fails on any hydration error.

const RESOURCES = { en: { common: { home: "Home" } } };

/** An http-like backend: resources arrive asynchronously, as `i18next-http-backend` does. */
const asyncBackend = {
  type: "backend" as const,
  init: () => undefined,
  read: (lng: string, ns: string, done: (error: null, data: object) => void) => {
    const data = (RESOURCES as Record<string, Record<string, object>>)[lng]?.[ns] ?? {};
    setTimeout(() => done(null, data), 5);
  },
};

function Probe() {
  const { t } = useTranslation();
  return (
    <nav>
      <a href="/">{t("home")}</a>
    </nav>
  );
}

function tree(instance: I18n, nonce: string) {
  return (
    <NonceProvider nonce={nonce}>
      <I18nextProvider i18n={instance}>
        <Probe />
      </I18nextProvider>
    </NonceProvider>
  );
}

async function serverMarkup(): Promise<string> {
  // Mirrors entry.server.tsx: namespaces from the route modules, resources available synchronously.
  const server = createInstance();
  await server.use(initReactI18next).init({
    ...i18nOptions,
    lng: "en",
    ns: ["common"],
    resources: RESOURCES,
  });
  return renderToString(tree(server, ""));
}

async function clientInstance(namespaces: string[]): Promise<I18n> {
  // Mirrors entry.client.tsx: http-like backend, namespaces from `getInitialNamespaces()`.
  const client = createInstance();
  await client
    .use(initReactI18next)
    .use(asyncBackend)
    .init({
      ...i18nOptions,
      lng: "en",
      ns: namespaces,
    });
  return client;
}

/** Hydrates `html` and returns every hydration problem React reported (recoverable or console). */
async function hydrationProblems(html: string, ui: React.ReactNode): Promise<string[]> {
  const problems: string[] = [];
  const consoleError = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    problems.push(args.map(String).join(" "));
  });
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.appendChild(container);
  let root: ReturnType<typeof hydrateRoot> | undefined;
  await act(async () => {
    root = hydrateRoot(container, ui, {
      onRecoverableError: (error) => {
        problems.push(error instanceof Error ? error.message : String(error));
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 60));
  });
  await act(async () => root?.unmount());
  container.remove();
  consoleError.mockRestore();
  return problems.filter((p) => /hydrat|did not match|didn't match|server rendered/i.test(p));
}

describe("root route i18n namespaces", () => {
  beforeEach(() => {
    (window as unknown as { __reactRouterRouteModules: unknown }).__reactRouterRouteModules = {
      // A route that declares nothing, like /tools and /sandbox.
      "routes/tools._index": { default: () => null },
      root: rootModule,
    };
  });
  afterEach(() => {
    (window as unknown as { __reactRouterRouteModules?: unknown }).__reactRouterRouteModules =
      undefined;
  });

  it("declares the common namespace on the root so every route preloads it", () => {
    expect(rootModule.handle).toEqual({ i18n: ["common"] });
    expect(getInitialNamespaces()).toContain("common");
  });

  it("hydrates server markup with no mismatch when the client preloads the root namespaces", async () => {
    const html = await serverMarkup();
    expect(html).toContain(">Home<");
    const client = await clientInstance(getInitialNamespaces());
    expect(await hydrationProblems(html, tree(client, ""))).toEqual([]);
  });

  it("positive control: a client that preloads no namespace (the old behaviour) is detected", async () => {
    const html = await serverMarkup();
    const client = await clientInstance([]);
    const problems = await hydrationProblems(html, tree(client, ""));
    expect(problems.length).toBeGreaterThan(0);
  });

  it("positive control: a plain deliberate text mismatch is detected", async () => {
    const html = '<nav><a href="/">Home</a></nav>';
    const client = await clientInstance(["common"]);
    const problems = await hydrationProblems(
      html,
      <nav>
        <a href="/">Different</a>
      </nav>,
    );
    expect(client).toBeDefined();
    expect(problems.length).toBeGreaterThan(0);
  });
});
