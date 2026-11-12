import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, waitFor } from "@testing-library/react";
import { createRoutesStub, data } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { RouteErrorBoundary } from "./RouteErrorBoundary";

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
  ]);
  return render(<Stub initialEntries={[path]} />);
}

describe("RouteErrorBoundary", () => {
  it("renders the unavailable state from a thrown data payload", async () => {
    renderWithLoader(() => {
      throw data({ kind: "unavailable" }, { status: 503 });
    });
    expect(
      await screen.findByRole("heading", { name: "We couldn't load your data" }),
    ).toBeDefined();
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
      await screen.findByRole("heading", { name: "We couldn't load your data" }),
    ).toBeDefined();
    expect(screen.queryByText(/secret token/)).toBeNull();
  });

  it("renders not-found copy for a 404 payload with a dashboard link", async () => {
    renderWithLoader(() => {
      throw data({ kind: "not-found" }, { status: 404 });
    });
    expect(await screen.findByRole("heading", { name: "We couldn't find that" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Go to dashboard" }).getAttribute("href")).toBe("/");
  });

  it("links back to accounts on the account detail route", async () => {
    renderWithLoader(() => {
      throw data({ kind: "not-found" }, { status: 404 });
    }, "/app/accounts/abc");
    const link = await screen.findByRole("link", { name: "Back to accounts" });
    expect(link.getAttribute("href")).toBe("/app/accounts");
  });

  it("forbidden looks identical to not-found", async () => {
    renderWithLoader(() => {
      throw data({ kind: "forbidden" }, { status: 403 });
    });
    expect(await screen.findByRole("heading", { name: "We couldn't find that" })).toBeDefined();
    expect(screen.queryByText("You don't have access to this")).toBeNull();
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
      await screen.findByRole("heading", { name: "We couldn't load your data" }),
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
    "app.tax",
    "app.onboarding",
  ];
  it.each(routes)("%s exports the shared ErrorBoundary", (route) => {
    const src = readFileSync(resolve(__dirname, `../../../../routes/${route}.tsx`), "utf8");
    expect(src).toContain(
      'export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";',
    );
  });
});
