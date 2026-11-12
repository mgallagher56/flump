import type { EntryContext } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("react-router", () => ({
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
    )) as Response;
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain("hello");
    expect(html).not.toContain("data-emotion");
  });
});
