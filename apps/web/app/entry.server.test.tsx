import { type EntryContext, RouterContextProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nonceContext } from "./security/csp.server";

vi.mock("react-router", async () => ({
  ...(await vi.importActual<typeof import("react-router")>("react-router")),
  ServerRouter: () => <main>hello</main>,
}));
vi.mock("react-i18next", async () => await vi.importActual("react-i18next"));
vi.mock("./i18n.server", () => ({
  default: { getLocale: vi.fn(async () => "en"), getRouteNamespaces: vi.fn(() => ["common"]) },
}));

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
});
