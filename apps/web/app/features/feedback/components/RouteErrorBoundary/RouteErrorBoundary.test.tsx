import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, waitFor } from "@testing-library/react";
import { createRoutesStub, data } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { RouteErrorBoundary, routeKeyFor } from "./RouteErrorBoundary";

// The global test setup stubs useRevalidator and Form; this suite needs the real router behaviour.
vi.mock("react-router", async () => await vi.importActual("react-router"));

function RouteContent() {
  return <p>Route content</p>;
}

function renderWithLoader(loader: () => unknown, path = "/") {
  const Stub = createRoutesStub([
    {
      path: "/",
      loader: loader as never,
      Component: RouteContent,
      ErrorBoundary: RouteErrorBoundary,
    },
    {
      path: "/app/accounts/:account",
      loader: loader as never,
      Component: RouteContent,
      ErrorBoundary: RouteErrorBoundary,
    },
    {
      path: "/app/tax/receipts/:id",
      loader: loader as never,
      Component: RouteContent,
      ErrorBoundary: RouteErrorBoundary,
    },
    {
      path: "*",
      loader: loader as never,
      Component: RouteContent,
      ErrorBoundary: RouteErrorBoundary,
    },
  ]);
  return render(<Stub initialEntries={[path]} />);
}

describe("RouteErrorBoundary", () => {
  it("renders the unavailable state from a thrown data payload", async () => {
    renderWithLoader(() => {
      throw data({ kind: "unavailable" }, { status: 503 });
    });
    expect(await screen.findByRole("heading", { name: "We could not reach Flump" })).toBeDefined();
    expect(screen.getByText("Error 503")).toBeDefined();
  });

  it("renders the server state with a retry and the status for a 500", async () => {
    renderWithLoader(() => {
      throw data({ kind: "server" }, { status: 500 });
    });
    expect(
      await screen.findByRole("heading", { name: "We could not load this page" }),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: "Try again" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Report this problem by email" })).toBeDefined();
    expect(screen.getByText("Error 500")).toBeDefined();
  });

  it("treats a failed fetch as a connection problem without leaking the message", async () => {
    renderWithLoader(() => {
      throw new TypeError("Failed to fetch https://api.internal/secret");
    });
    expect(await screen.findByRole("heading", { name: "We could not reach Flump" })).toBeDefined();
    expect(screen.queryByText(/internal/)).toBeNull();
  });

  it("focuses the heading when the boundary renders after an in-app navigation", async () => {
    window.history.replaceState({ idx: 1 }, "");
    renderWithLoader(() => {
      throw data({ kind: "server" }, { status: 500 });
    });
    const heading = await screen.findByRole("heading", { name: "We could not load this page" });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    window.history.replaceState(null, "");
  });

  it("Try again re-runs the loader and renders the route on success", async () => {
    let calls = 0;
    // Real loaders are async; a loader that settles synchronously never renders the "loading"
    // revalidation state, which React Router needs in order to reset a tripped boundary.
    renderWithLoader(async () => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 20));
      if (calls === 1) throw data({ kind: "unavailable" }, { status: 503 });
      return null;
    });
    const button = await screen.findByRole("button", { name: "Try again" });
    button.click();
    await waitFor(() => expect(screen.getByText("Route content")).toBeDefined());
    expect(calls).toBe(2);
  });

  it("renders unknown state for a plain Error without leaking its message", async () => {
    renderWithLoader(() => {
      throw new Error("secret token abc123");
    });
    expect(
      await screen.findByRole("heading", { name: "We could not load this page" }),
    ).toBeDefined();
    expect(screen.queryByText(/secret token/)).toBeNull();
  });

  it("renders not-found copy for a 404 payload with a dashboard link", async () => {
    renderWithLoader(() => {
      throw data({ kind: "not-found" }, { status: 404 });
    });
    expect(await screen.findByRole("heading", { name: "We cannot find that page" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Go to the home page" }).getAttribute("href")).toBe(
      "/",
    );
    expect(screen.queryByText("Error 404")).toBeNull();
    expect(screen.queryByRole("link", { name: "Back to home" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("renders not-found copy for a bare 404 response from the catch-all route", async () => {
    renderWithLoader(() => {
      throw new Response("Not Found", { status: 404, statusText: "Not Found" });
    });
    expect(await screen.findByRole("heading", { name: "We cannot find that page" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    expect(screen.getByRole("link", { name: "Go to the home page" }).getAttribute("href")).toBe(
      "/",
    );
  });

  it("links back to accounts on the account detail route", async () => {
    renderWithLoader(() => {
      throw data({ kind: "not-found" }, { status: 404 });
    }, "/app/accounts/abc");
    const link = await screen.findByRole("link", { name: "Back to accounts" });
    expect(link.getAttribute("href")).toBe("/app/accounts");
  });

  it("forbidden looks identical to not-found, status included", async () => {
    renderWithLoader(() => {
      throw data({ kind: "forbidden" }, { status: 403 });
    });
    expect(await screen.findByRole("heading", { name: "We cannot find that page" })).toBeDefined();
    expect(screen.queryByText("You do not have access to this page")).toBeNull();
    expect(screen.queryByText("Error 403")).toBeNull();
    expect(screen.queryByText("Error 404")).toBeNull();
  });

  it("treats Safari's 'Load failed' as a connection problem", async () => {
    renderWithLoader(() => {
      throw new TypeError("Load failed");
    });
    expect(await screen.findByRole("heading", { name: "We could not reach Flump" })).toBeDefined();
  });

  it("renders the heading as the page h1, since it replaces the route's PageHeader", async () => {
    renderWithLoader(() => {
      throw data({ kind: "server" }, { status: 500 });
    });
    expect(
      await screen.findByRole("heading", { level: 1, name: "We could not load this page" }),
    ).toBeDefined();
  });

  it("does not make the error state a live region, so focus is the single announcement", async () => {
    renderWithLoader(() => {
      throw data({ kind: "server" }, { status: 500 });
    });
    await screen.findByRole("heading", { name: "We could not load this page" });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it.each([
    ["/app/accounts/acc_123", "[/app/accounts/:id]"],
    ["/app/tax/receipts/rcpt-42", "[/app/tax/receipts/:id]"],
    ["/app/tax/receipts/plain", "[/app/tax/receipts/:id]"],
    ["/app/things/550e8400-e29b-41d4-a716-446655440000/edit", "[/app/things/:id/edit]"],
    ["/app/things/12345", "[/app/things/:id]"],
    ["/app/things/a1b2c3d4e5f6", "[/app/things/:id]"],
    ["/app/take-home", "[/app/take-home]"],
  ])("strips record ids from the feedback subject on %s", async (path, subject) => {
    renderWithLoader(() => {
      throw data({ kind: "server" }, { status: 500 });
    }, path);
    const link = await screen.findByRole("link", { name: "Report this problem by email" });
    const href = decodeURIComponent(link.getAttribute("href") ?? "");
    expect(href).toContain(subject);
  });

  it("renders a sign-in form posting to /logout for 401", async () => {
    const { container } = renderWithLoader(() => {
      throw data({ kind: "unauthorised" }, { status: 401 });
    });
    expect(await screen.findByRole("heading", { name: "Your session has ended" })).toBeDefined();
    const form = container.querySelector("form") as HTMLFormElement;
    expect(form.getAttribute("action")).toBe("/logout");
    expect(form.getAttribute("method")).toBe("post");
  });

  it("treats an unrecognised payload kind as unknown", async () => {
    renderWithLoader(() => {
      throw data({ kind: "bogus" }, { status: 500 });
    });
    expect(
      await screen.findByRole("heading", { name: "We could not load this page" }),
    ).toBeDefined();
  });
});

describe("route modules", () => {
  const routes = [
    "_index",
    "app.accounts._index",
    "app.accounts.$account",
    "app.budget",
    "app.debt",
    "app.mortgage",
    "app.pension",
    "app.profile",
    "app.savings",
    "app.self-assessment",
    "app.take-home",
    "app.onboarding",
  ];
  it.each(routes)("%s exports the shared ErrorBoundary", (route) => {
    const src = readFileSync(resolve(__dirname, `../../../../routes/${route}.tsx`), "utf8");
    expect(src).toContain(
      'export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";',
    );
  });
});

describe("routeKeyFor covers every dynamic route", () => {
  // One example path per dynamic route file in app/routes, with the subject key it must produce.
  // Adding a `$` route without a row here fails the coverage test below.
  const DYNAMIC_ROUTES: Record<string, readonly (readonly [string, string])[]> = {
    $: [
      ["/no/such/page", "/no/such/page"],
      ["/old/links/abc12345def", "/old/links/:id"],
    ],
    "$feature._index": [
      ["/debt", "/debt"],
      ["/take-home", "/take-home"],
    ],
    "api.$": [["/api/accounts/550e8400-e29b-41d4-a716-446655440000", "/api/accounts/:id"]],
    "app.accounts.$account": [
      ["/app/accounts/acc_123", "/app/accounts/:id"],
      ["/app/accounts/savings", "/app/accounts/:id"],
    ],
    "app.imports.$id": [["/app/imports/b0000000-0000-4000-8000-000000000001", "/app/imports/:id"]],
    "app.tax.receipts.$id": [
      ["/app/tax/receipts/rcpt-42", "/app/tax/receipts/:id"],
      ["/app/tax/receipts/plain", "/app/tax/receipts/:id"],
    ],
    "tools.$slug": [
      ["/tools/uk-100k-tax-trap-calculator", "/tools/uk-100k-tax-trap-calculator"],
      [
        "/tools/0-percent-balance-transfer-payoff-calculator",
        "/tools/0-percent-balance-transfer-payoff-calculator",
      ],
      ["/tools/mortgage-overpay-vs-isa", "/tools/mortgage-overpay-vs-isa"],
    ],
  };

  it("has a row for every dynamic route file", () => {
    const dynamic = readdirSync(resolve(__dirname, "../../../../routes"))
      .filter((f) => f.includes("$") && /\.tsx?$/.test(f) && !/\.(test|spec)\./.test(f))
      .map((f) => f.replace(/\.tsx?$/, ""))
      .sort();
    expect(Object.keys(DYNAMIC_ROUTES).sort()).toEqual(dynamic);
  });

  it.each(
    Object.entries(DYNAMIC_ROUTES).flatMap(([route, rows]) =>
      rows.map(([path, key]) => [route, path, key] as const),
    ),
  )("%s: %s becomes %s", (_route, path, key) => {
    expect(routeKeyFor(path)).toBe(key);
  });
});
