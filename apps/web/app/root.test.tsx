import { render, screen } from "@testing-library/react";
import { createRoutesStub, data } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The global test setup stubs parts of react-router; the root boundary needs the real router.
vi.mock("react-router", async () => await vi.importActual("react-router"));
vi.mock("./i18n.server", () => ({ default: { getLocale: vi.fn() } }));
vi.mock("./utils/auth.server", () => ({ getAuthSession: vi.fn() }));

import i18next from "./i18n.server";
import App, { ErrorBoundary, loader } from "./root";
import { getAuthSession } from "./utils/auth.server";

const NullFallback = () => null;

function RouteContent() {
  return <p>Route content</p>;
}

function renderRootBoundary(error: unknown) {
  const Stub = createRoutesStub([
    {
      path: "/",
      loader: () => {
        throw error;
      },
      Component: RouteContent,
      ErrorBoundary,
    },
  ]);
  return render(<Stub initialEntries={["/"]} />, { container: document });
}

describe("root ErrorBoundary", () => {
  afterEach(() => {
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-theme");
  });

  it("renders the shared unavailable state as a single document without inline styles", async () => {
    renderRootBoundary(data({ kind: "unavailable" }, { status: 503 }));

    expect(
      await screen.findByRole("heading", { name: "We couldn't load your data" }),
    ).toBeDefined();
    expect(document.querySelectorAll("html")).toHaveLength(1);
    expect(document.querySelectorAll("[style]")).toHaveLength(0);
    expect(document.body.textContent).not.toMatch(/Uh oh/);
    expect(document.documentElement.getAttribute("data-theme")).toBeTruthy();
  });

  it("renders the unknown state for a plain Error without leaking its message", async () => {
    renderRootBoundary(new Error("secret token abc123"));

    expect(
      await screen.findByRole("heading", { name: "We couldn't load your data" }),
    ).toBeDefined();
    expect(document.body.textContent).not.toMatch(/secret token/);
    expect(document.querySelectorAll("html")).toHaveLength(1);
    expect(document.querySelectorAll("[style]")).toHaveLength(0);
  });
});

describe("root App landmarks", () => {
  it("skip link targets the main landmark", async () => {
    const Stub = createRoutesStub([
      {
        path: "/",
        loader: () => ({
          locale: "en",
          user: null,
          userProfile: null,
          ENV: { SENTRY_DSN: "", SENTRY_ENVIRONMENT: "", SENTRY_RELEASE: "" },
        }),
        Component: App as any,
        HydrateFallback: NullFallback,
      },
    ]);
    render(<Stub initialEntries={["/"]} />, { container: document });

    const link = await screen.findByRole("link", { name: "Skip to content" });
    expect(link.getAttribute("href")).toBe("#main-content");
    const main = document.getElementById("main-content");
    expect(main?.tagName).toBe("MAIN");
    expect(main?.getAttribute("tabindex")).toBe("-1");
  });
});

describe("root loader", () => {
  const args = { request: new Request("http://localhost/"), params: {}, context: {} } as any;

  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  beforeEach(() => {
    vi.mocked(i18next.getLocale).mockResolvedValue("en");
    vi.mocked(getAuthSession).mockResolvedValue({ user: { id: "u" }, accessToken: "tok" } as any);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("keeps the shell up with a null profile when the backend is 503", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("down"));
    const result = await loader(args);
    expect(result.userProfile).toBeNull();
    expect(Object.keys(result.ENV).sort()).toEqual([
      "SENTRY_DSN",
      "SENTRY_ENVIRONMENT",
      "SENTRY_RELEASE",
    ]);
    expect(result).not.toHaveProperty("accessToken");
  });

  it("keeps the shell up with a null profile when the backend is 401", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("x", { status: 401 }));
    const result = await loader(args);
    expect(result.userProfile).toBeNull();
    expect(result.user).toEqual({ id: "u" });
  });

  it("logs only the kind and endpoint, never the token", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("x", { status: 500 }));
    await loader(args);
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(logged).toContain("/user-profile");
    expect(logged).not.toContain("tok");
  });

  it("loads the profile on success", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ annualSalary: 5 }), { status: 200 }));
    const result = await loader(args);
    expect(result.userProfile).toEqual({ annualSalary: 5 });
  });

  it("lets a redirect Response from the auth session pass through", async () => {
    const r = new Response(null, { status: 302, headers: { Location: "/x" } });
    vi.mocked(getAuthSession).mockRejectedValue(r);
    await expect(loader(args)).rejects.toBe(r);
  });
});
