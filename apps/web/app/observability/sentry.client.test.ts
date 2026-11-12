import { assertSafeOptions, scrubBreadcrumb } from "@flump/observability";
import * as Sentry from "@sentry/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DENY_URLS, init } from "./sentry.client";
import { WITHHELD } from "./withhold";

vi.mock("@sentry/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sentry/react")>();
  return {
    ...actual,
    init: vi.fn(),
    captureException: vi.fn(),
    breadcrumbsIntegration: vi.fn(actual.breadcrumbsIntegration),
  };
});

const DSN = "http://public@127.0.0.1:9/1";

function initArgs() {
  return vi.mocked(Sentry.init).mock.calls[0]?.[0] as unknown as Record<string, unknown> & {
    integrations: { name: string }[];
    beforeSend: (e: unknown) => { exception: { values: { value: string }[] } } | null;
    beforeBreadcrumb: (b: unknown) => { data: Record<string, string> } | null;
  };
}

describe("sentry.client init", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does nothing without a DSN", () => {
    expect(init(undefined)).toBe(false);
    expect(init({})).toBe(false);
    expect(init({ SENTRY_DSN: "  " })).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it("passes options that satisfy assertSafeOptions", () => {
    expect(init({ SENTRY_DSN: DSN, SENTRY_RELEASE: "abc1234" })).toBe(true);
    const opts = initArgs();
    expect(() => assertSafeOptions(opts)).not.toThrow();
    expect(opts).toMatchObject({
      dsn: DSN,
      release: "abc1234",
      environment: "unknown",
      sendDefaultPii: false,
      tracesSampleRate: 0,
      defaultIntegrations: false,
      denyUrls: DENY_URLS,
    });
  });

  it("uses only the allow-listed integrations: no tracing, replay, feedback or session", () => {
    init({ SENTRY_DSN: DSN });
    const names = initArgs().integrations.map((i) => i.name);
    expect(names).toEqual(
      expect.arrayContaining(["GlobalHandlers", "Breadcrumbs", "LinkedErrors", "Dedupe"]),
    );
    for (const banned of [
      "HttpContext",
      "BrowserSession",
      "BrowserTracing",
      "Replay",
      "Feedback",
    ]) {
      expect(names).not.toContain(banned);
    }
  });

  it("collects only fetch, xhr and history breadcrumbs", () => {
    init({ SENTRY_DSN: DSN });
    expect(Sentry.breadcrumbsIntegration).toHaveBeenCalledExactlyOnceWith({
      console: false,
      dom: false,
      sentry: false,
      fetch: true,
      xhr: true,
      history: true,
    });
  });

  it("denies browser extension scripts", () => {
    const denied = (url: string) => DENY_URLS.some((re) => re.test(url));
    expect(denied("chrome-extension://abc/content.js")).toBe(true);
    expect(denied("moz-extension://abc/content.js")).toBe(true);
    expect(denied("safari-web-extension://abc/content.js")).toBe(true);
    expect(denied("https://app.flump.test/assets/entry.js")).toBe(false);
  });

  it("scrubs a navigation breadcrumb down to the path", () => {
    init({ SENTRY_DSN: DSN });
    const crumb = initArgs().beforeBreadcrumb({
      category: "navigation",
      data: { from: "/dashboard", to: "/callback?code=X&state=Y" },
    });
    expect(crumb?.data.to).toBe("/callback");
    expect(JSON.stringify(crumb)).not.toMatch(/code=|state=/);
  });

  it("uses the shared scrubBreadcrumb and drops console and dom crumbs", () => {
    init({ SENTRY_DSN: DSN });
    expect(initArgs().beforeBreadcrumb).toBe(scrubBreadcrumb);
    expect(initArgs().beforeBreadcrumb({ category: "console", message: "token=abc" })).toBeNull();
    expect(initArgs().beforeBreadcrumb({ category: "ui.click", message: "button" })).toBeNull();
  });

  it("withholds exception messages before sending", () => {
    init({ SENTRY_DSN: DSN });
    const out = initArgs().beforeSend({
      exception: { values: [{ type: "TypeError", value: "ada@example.com is not valid" }] },
    });
    expect(out?.exception.values[0]?.value).toBe(WITHHELD);
  });
});
