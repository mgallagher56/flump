import { render, screen } from "@testing-library/react";
import { createRoutesStub, data } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

// The global test setup stubs parts of react-router; the root boundary needs the real router.
vi.mock("react-router", async () => await vi.importActual("react-router"));
vi.mock("./i18n.server", () => ({ default: { getLocale: vi.fn() } }));
vi.mock("./utils/auth.server", () => ({ getAuthSession: vi.fn() }));

import { ErrorBoundary } from "./root";

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
