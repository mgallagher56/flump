import { createInstance, type i18n as I18n } from "i18next";
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { I18nextProvider, initReactI18next, useTranslation } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import i18nOptions from "./i18n";
import { NonceProvider } from "./security/nonce";

vi.mock("react-i18next", async () => await vi.importActual("react-i18next"));

// React #418 on /tools and /sandbox (E20-N11 follow-up). Root cause: the shell (Header, footer) uses
// the `common` i18n namespace. If the client did not preload it, the server (sync fs backend) would
// render "Home" while the client (async http backend) rendered the key "home" before `common.json`
// arrived. Both sides now use the static `ns` from app/i18n.ts, so every route preloads `common`.
// This test hydrates real server markup with the real development React build and fails on any
// hydration error.

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
  // Mirrors entry.server.tsx: namespaces from the shared i18n config, resources available synchronously.
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
  // Mirrors entry.client.tsx: http-like backend, namespaces from the shared i18n config.
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

describe("i18n namespaces on hydration", () => {
  it("declares the common namespace in the shared config so every route preloads it", () => {
    expect(i18nOptions.ns).toContain("common");
  });

  it("hydrates server markup with no mismatch when the client preloads the root namespaces", async () => {
    const html = await serverMarkup();
    expect(html).toContain(">Home<");
    const client = await clientInstance(i18nOptions.ns);
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
