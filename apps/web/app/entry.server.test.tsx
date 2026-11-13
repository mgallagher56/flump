import { useTranslation } from "react-i18next";
import { type EntryContext, RouterContextProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nonceContext } from "./security/csp.server";

vi.mock("react-router", async () => ({
  ...(await vi.importActual<typeof import("react-router")>("react-router")),
  ServerRouter: () => {
    const { t } = useTranslation();
    return (
      <main>
        hello <span id="smoke">{t("dashboard")}</span>
      </main>
    );
  },
}));
vi.mock("react-i18next", async () => await vi.importActual("react-i18next"));

import handleRequest from "./entry.server";

afterEach(() => vi.restoreAllMocks());

describe("entry.server", () => {
  it("renders HTML without Emotion style tags", async () => {
    const response = (await handleRequest(
      new Request("http://localhost/", { headers: { "user-agent": "Googlebot" } }),
      200,
      new Headers(),
      {} as EntryContext,
      new RouterContextProvider(),
    )) as Response;
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain("hello");
    expect(html).not.toContain("data-emotion");
  });

  it("renders with the nonce from the router context", async () => {
    const loadContext = new RouterContextProvider();
    loadContext.set(nonceContext, "test-nonce");
    const response = (await handleRequest(
      new Request("http://localhost/", { headers: { "user-agent": "Googlebot" } }),
      200,
      new Headers(),
      {} as EntryContext,
      loadContext,
    )) as Response;
    expect(response.status).toBe(200);
  });

  // SSR smoke: the real i18next instance and fs backend resolve a key from public/locales/en/common.json.
  it("renders a translated string from the locale file, not the raw key", async () => {
    const response = (await handleRequest(
      new Request("http://localhost/", { headers: { "user-agent": "Googlebot" } }),
      200,
      new Headers(),
      {} as EntryContext,
      new RouterContextProvider(),
    )) as Response;
    const html = await response.text();
    expect(html).toContain(">Dashboard</span>");
    expect(html).not.toContain(">dashboard</span>");
  });
});
