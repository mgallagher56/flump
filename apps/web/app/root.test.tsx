import { fireEvent, render, screen, within } from "@testing-library/react";
import mockUser from "__mocks__/user";
import { createRoutesStub, data, Link, Outlet } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The global test setup stubs parts of react-router; the root boundary needs the real router.
vi.mock("react-router", async () => await vi.importActual("react-router"));
vi.mock("./utils/auth.server", () => ({ getAuthSession: vi.fn() }));
vi.mock("./services/beta-mode.server", () => ({ isInviteOnly: vi.fn() }));

import { jsonResponse, profileFixture } from "~/test/fixtures/contractResponses";
import { RouteErrorBoundary } from "./features/feedback/components/RouteErrorBoundary";
import { resetRememberedRootUser, useRootUser } from "./hooks/useRootUser";
import App, { ErrorBoundary, loader } from "./root";
import * as splatRoute from "./routes/$";
import { isInviteOnly } from "./services/beta-mode.server";
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

/** Like the app shell: reads the root user on every render, so the browser remembers it. */
function ShellOutlet() {
  useRootUser();
  return <Outlet />;
}

function GoSlowLink() {
  return <Link to="/slow">Go slow</Link>;
}

function SlowPage() {
  return <p>Slow page</p>;
}

const neverResolves = () => new Promise(() => {});

/** A page's own boundary, as the app routes export it. */
function ChildBoundary() {
  return <RouteErrorBoundary />;
}

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
    resetRememberedRootUser();
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

  it("shows the one not-invited page with no header, nav or Sign up, and a Sign out", async () => {
    renderRootBoundary(data({ kind: "not-invited", endpoint: "/user-profile" }, { status: 403 }));
    expect(
      await screen.findByRole("heading", { name: "This account has not been invited yet" }),
    ).toBeDefined();
    expect(
      screen.getByText(
        "Flump is in a private test. If you were expecting an invitation, check you signed in with the address it was sent to. If you were sent an invite link, open it again while signed in.",
      ),
    ).toBeDefined();
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.queryByRole("banner")).toBeNull();
    expect(screen.queryByRole("link", { name: /sign ?up/i })).toBeNull();
    expect(screen.queryByText("Error 403")).toBeNull();
    const signOut = screen.getByRole("button", { name: "Sign out" });
    expect(signOut.closest("form")?.getAttribute("action")).toBe("/logout");
    expect(document.title).toBe("This account has not been invited yet");
  });

  it("passes a page's not-invited error up to the root page, without the signed-in chrome", async () => {
    const Stub = createRoutesStub([
      {
        id: "root",
        loader: rootData(mockUser),
        Component: ShellOutlet,
        ErrorBoundary,
        HydrateFallback: NullFallback,
        children: [
          {
            path: "/",
            loader: () => {
              throw data({ kind: "not-invited", endpoint: "/accounts" }, { status: 403 });
            },
            Component: RouteContent,
            ErrorBoundary: ChildBoundary,
          },
        ],
      },
    ]);
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<Stub initialEntries={["/"]} />, { container: document });
    expect(
      await screen.findByRole("heading", { name: "This account has not been invited yet" }),
    ).toBeDefined();
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.queryByText("Route content")).toBeNull();
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

  it("keeps the signed-in shell when a later data request fails and takes the root data with it (P17)", async () => {
    // First load: the root loader gives the user. Then a link's data request fails for every
    // route, the root too (a dropped connection), so React Router drops the root data.
    let rootCalls = 0;
    const Stub = createRoutesStub([
      {
        id: "root",
        path: "/",
        loader: () => {
          rootCalls += 1;
          if (rootCalls > 1) throw new TypeError("Failed to fetch");
          return rootData(mockUser)();
        },
        shouldRevalidate: () => true,
        Component: ShellOutlet,
        ErrorBoundary,
        HydrateFallback: NullFallback,
        children: [
          { index: true, Component: GoSlowLink },
          { path: "slow", Component: SlowPage },
        ],
      },
    ]);
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<Stub initialEntries={["/"]} />, { container: document });
    fireEvent.click(await screen.findByRole("link", { name: "Go slow" }));
    await screen.findByRole("heading", { name: "We could not reach Flump" });
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

  it("renders AppFooter for signed-in users", async () => {
    const SignedInStub = createRoutesStub([
      {
        id: "root",
        path: "/",
        loader: rootData(mockUser),
        Component: App as any,
        HydrateFallback: NullFallback,
      },
    ]);
    render(<SignedInStub initialEntries={["/"]} />, { container: document });
    const footer = await screen.findByRole("contentinfo");
    // One line: the logo linked home and the company name.
    expect(within(footer).getByRole("link", { name: "Flump home" }).getAttribute("href")).toBe("/");
  });

  it("omits AppFooter when signed out", async () => {
    const SignedOutStub = createRoutesStub([
      {
        id: "root",
        path: "/",
        loader: rootData(null),
        Component: App as any,
        HydrateFallback: NullFallback,
      },
    ]);
    render(<SignedOutStub initialEntries={["/"]} />, { container: document });
    await screen.findByRole("main");
    expect(screen.queryByRole("contentinfo")).toBeNull();
  });
});

describe("root loader", () => {
  // A fresh router context per call, as React Router gives each request (the profile read is
  // shared per context).
  let args: any;

  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  beforeEach(() => {
    args = { request: new Request("http://localhost/"), params: {}, context: {} };
    vi.mocked(getAuthSession).mockResolvedValue({ user: { id: "u" }, accessToken: "tok" } as any);
    vi.mocked(isInviteOnly).mockResolvedValue(false);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns the beta mode for the chrome", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse(profileFixture));
    expect((await loader(args)).inviteOnly).toBe(false);
    vi.mocked(isInviteOnly).mockResolvedValue(true);
    args = { ...args, context: {} };
    expect((await loader(args)).inviteOnly).toBe(true);
  });

  it("on an invite link, marks the person not invited instead of throwing, with no user", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response('{"error":"not_invited"}', { status: 403 }));
    args = { ...args, request: new Request("http://localhost/invite") };
    const result = await loader(args);
    expect(result.notInvited).toBe(true);
    expect(result.user).toBeNull();
  });

  it("throws the not-invited route error instead of keeping the shell up", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response('{"error":"not_invited"}', { status: 403 }));
    const thrown = await loader(args).catch((e: unknown) => e);
    expect(thrown).toMatchObject({ init: { status: 403 }, data: { kind: "not-invited" } });
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
