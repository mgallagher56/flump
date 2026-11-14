import { fireEvent, render, screen, within } from "@testing-library/react";
import mockUser from "__mocks__/user";
import { createRoutesStub, data, Link, Outlet } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The global test setup stubs parts of react-router; the root boundary needs the real router.
vi.mock("react-router", async () => await vi.importActual("react-router"));
vi.mock("./utils/auth.server", () => ({ getAuthSession: vi.fn() }));

import { jsonResponse, profileFixture } from "~/test/fixtures/contractResponses";
import App, { ErrorBoundary, loader } from "./root";
import * as splatRoute from "./routes/$";
import { getAuthSession } from "./utils/auth.server";

const ENV = { SENTRY_DSN: "", SENTRY_ENVIRONMENT: "", SENTRY_RELEASE: "" };
const rootData = (user: unknown) => () => ({ locale: "en", user, userProfile: null, ENV });

const primaryNavHrefs = () =>
  Array.from(screen.getByRole("navigation", { name: "Primary" }).querySelectorAll("a")).map((a) =>
    a.getAttribute("href"),
  );

const NullFallback = () => null;

function ThrowingPage(): never {
  throw new Error("render failed");
}

function RootOutlet() {
  return <Outlet />;
}

function GoSlowLink() {
  return <Link to="/slow">Go slow</Link>;
}

function SlowPage() {
  return <p>Slow page</p>;
}

const neverResolves = () => new Promise(() => {});

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

    expect(await screen.findByRole("heading", { name: "We could not reach Flump" })).toBeDefined();
    expect(document.querySelectorAll("html")).toHaveLength(1);
    expect(document.querySelectorAll("[style]")).toHaveLength(0);
    expect(document.body.textContent).not.toMatch(/Uh oh/);
    expect(document.documentElement.getAttribute("data-theme")).toBeTruthy();
  });

  it("keeps the normal header, signed out, when the root loader itself failed", async () => {
    renderRootBoundary(data({ kind: "unavailable" }, { status: 503 }));
    await screen.findByRole("heading", { name: "We could not reach Flump" });
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeDefined();
    expect(screen.getByRole("link", { name: "logIn" }).getAttribute("href")).toBe("/login");
    expect(document.documentElement.getAttribute("lang")).toBe("en-GB");
    expect(document.title).toBe("This page did not load");
  });

  it("keeps the signed-in header when a page fails below the root loader", async () => {
    const Stub = createRoutesStub([
      {
        id: "root",
        path: "/",
        loader: rootData(mockUser),
        Component: ThrowingPage,
        ErrorBoundary,
        HydrateFallback: NullFallback,
      },
    ]);
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<Stub initialEntries={["/"]} />, { container: document });
    await screen.findByRole("heading", { name: "We could not load this page" });
    expect(primaryNavHrefs()).toContain("/app/accounts");
    expect(screen.queryByRole("link", { name: "logIn" })).toBeNull();
  });

  it("keeps the signed-in header when a child route without its own boundary throws", async () => {
    const Stub = createRoutesStub([
      {
        id: "root",
        path: "/",
        loader: rootData(mockUser),
        Component: RootOutlet,
        ErrorBoundary,
        HydrateFallback: NullFallback,
        children: [{ path: "broken", Component: ThrowingPage }],
      },
    ]);
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<Stub initialEntries={["/broken"]} />, { container: document });
    await screen.findByRole("heading", { name: "We could not load this page" });
    expect(primaryNavHrefs()).toContain("/app/accounts");
    expect(screen.queryByRole("link", { name: "logIn" })).toBeNull();
    expect(screen.getByRole("button", { name: "accountMenu" })).toBeDefined();
  });

  it("renders the unknown state for a plain Error without leaking its message", async () => {
    renderRootBoundary(new Error("secret token abc123"));

    expect(
      await screen.findByRole("heading", { name: "We could not load this page" }),
    ).toBeDefined();
    expect(document.body.textContent).not.toMatch(/secret token/);
    expect(document.querySelectorAll("html")).toHaveLength(1);
    expect(document.querySelectorAll("[style]")).toHaveLength(0);
  });
});

describe("root App 404", () => {
  const renderUnknownAppUrl = (user: unknown) => {
    const Stub = createRoutesStub([
      {
        id: "root",
        path: "/",
        loader: rootData(user),
        Component: App as any,
        HydrateFallback: NullFallback,
        children: [
          {
            path: "*",
            loader: splatRoute.loader,
            Component: splatRoute.default,
            ErrorBoundary: splatRoute.ErrorBoundary,
          },
        ],
      },
    ]);
    return render(<Stub initialEntries={["/app/not-a-page"]} />, { container: document });
  };

  it("an unknown /app/* URL keeps the signed-in header and offers one way back", async () => {
    renderUnknownAppUrl(mockUser);
    expect(await screen.findByRole("heading", { name: "We cannot find that page" })).toBeDefined();
    expect(primaryNavHrefs()).toContain("/app/accounts");
    const main = screen.getByRole("main");
    expect(within(main).getAllByRole("link")).toHaveLength(1);
    expect(within(main).getByRole("link", { name: "Back to home" }).getAttribute("href")).toBe("/");
    expect(document.documentElement.getAttribute("lang")).toBe("en-GB");
  });

  it("an unknown URL keeps the signed-out header for a visitor", async () => {
    renderUnknownAppUrl(null);
    expect(await screen.findByRole("heading", { name: "We cannot find that page" })).toBeDefined();
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeDefined();
    expect(screen.getByRole("link", { name: "logIn" })).toBeDefined();
    expect(
      within(screen.getByRole("main")).getByRole("link", { name: "Go to the home page" }),
    ).toBeDefined();
  });
});

describe("root App loading state", () => {
  it("keeps the current page on screen while a slow navigation loads, with only the progress bar", async () => {
    const Stub = createRoutesStub([
      {
        id: "root",
        path: "/",
        loader: rootData(null),
        Component: App as any,
        HydrateFallback: NullFallback,
        children: [
          { index: true, Component: GoSlowLink },
          { path: "slow", loader: neverResolves, Component: SlowPage },
        ],
      },
    ]);
    render(<Stub initialEntries={["/"]} />, { container: document });
    fireEvent.click(await screen.findByRole("link", { name: "Go slow" }));
    // The progress bar appears after the shared delay; the old page is never swapped for a skeleton.
    expect(await screen.findByRole("progressbar", {}, { timeout: 2000 })).toBeDefined();
    expect(screen.queryByTestId("page-skeleton")).toBeNull();
    expect(screen.getByText("Go slow").closest("[style*='display: none']")).toBeNull();
  });
});

describe("root App landmarks", () => {
  it("skip link targets the main landmark", async () => {
    const Stub = createRoutesStub([
      {
        path: "/",
        loader: rootData(null),
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

  it("sends an erased account (410) to finish the deletion", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response('{"error":"account_deleted"}', { status: 410 }));
    const thrown = await loader(args).catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(302);
    expect((thrown as Response).headers.get("Location")).toBe("/account-deleted?state=pending");
  });

  it("does not redirect a 410 while already on the account-deleted page", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 410 }));
    const onPage = {
      request: new Request("http://localhost/account-deleted?state=pending"),
      params: {},
      context: {},
    } as any;
    const result = await loader(onPage);
    expect(result.userProfile).toBeNull();
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
      .mockResolvedValue(jsonResponse({ ...profileFixture, annualSalary: 5 }));
    const result = await loader(args);
    expect(result.userProfile).toEqual({ ...profileFixture, annualSalary: 5 });
  });

  it("lets a redirect Response from the auth session pass through", async () => {
    const r = new Response(null, { status: 302, headers: { Location: "/x" } });
    vi.mocked(getAuthSession).mockRejectedValue(r);
    await expect(loader(args)).rejects.toBe(r);
  });
});
