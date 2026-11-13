import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RouteErrorState } from "./RouteErrorState";

describe("RouteErrorState", () => {
  it("renders the unavailable heading and calls onRetry from 'Try again'", () => {
    const onRetry = vi.fn();
    render(<RouteErrorState kind="server" onRetry={onRetry} />);

    expect(screen.getByRole("heading", { name: "We couldn't load your data" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows 'Trying again...' and disables the button while retrying", () => {
    render(<RouteErrorState kind="unavailable" onRetry={() => {}} retrying />);

    const button = screen.getByRole("button", { name: "Trying again..." }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("renders the not-found heading and a link to primaryHref", () => {
    render(
      <RouteErrorState
        kind="not-found"
        primaryHref="/app/accounts"
        primaryLabel="Back to accounts"
      />,
    );

    expect(screen.getByRole("heading", { name: "We couldn't find that" })).toBeDefined();
    const link = screen.getByRole("link", { name: "Back to accounts" });
    expect(link.getAttribute("href")).toBe("/app/accounts");
  });

  it("renders the unauthorised state with a POST form to /logout", () => {
    const { container } = render(<RouteErrorState kind="unauthorised" signInAction="/logout" />);

    expect(screen.getByRole("heading", { name: "Your session has ended" })).toBeDefined();
    const form = container.querySelector("form") as HTMLFormElement;
    expect(form.getAttribute("method")?.toLowerCase()).toBe("post");
    expect(form.getAttribute("action")).toBe("/logout");
    expect(screen.getByRole("button", { name: "Sign in again" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("defaults the unauthorised form action to /logout", () => {
    const { container } = render(<RouteErrorState kind="unauthorised" />);
    expect(container.querySelector("form")?.getAttribute("action")).toBe("/logout");
  });

  it("falls back to the generic state for unknown kinds", () => {
    render(<RouteErrorState kind="unknown" onRetry={() => {}} />);
    expect(screen.getByRole("heading", { name: "We couldn't load your data" })).toBeDefined();
  });

  it("renders a forbidden state", () => {
    render(<RouteErrorState kind="forbidden" />);
    expect(screen.getByRole("heading", { name: "You don't have access to this" })).toBeDefined();
  });

  it("renders an invite-only state with a sign out action", () => {
    render(<RouteErrorState kind="not-invited" onRetry={() => {}} />);
    expect(screen.getByRole("heading", { name: "Flump is invite-only for now" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("never renders an exclamation mark", () => {
    const kinds = [
      "unauthorised",
      "forbidden",
      "not-invited",
      "not-found",
      "client",
      "server",
      "unavailable",
      "bad-response",
      "unknown",
    ] as const;
    for (const kind of kinds) {
      const { container, unmount } = render(
        <RouteErrorState kind={kind} onRetry={() => {}} primaryHref="/app" primaryLabel="Back" />,
      );
      expect(container.textContent).not.toContain("!");
      unmount();
    }
  });

  it("offers a 'Report this problem' mailto link on error and invite-only states", () => {
    const { unmount } = render(
      <RouteErrorState kind="unavailable" onRetry={() => {}} routeKey="/app/debt" />,
    );
    const link = screen.getByRole("link", { name: "Report this problem by email" });
    const href = link.getAttribute("href") ?? "";
    expect(href.startsWith("mailto:")).toBe(true);
    expect(decodeURIComponent(href)).toContain("[/app/debt]");
    unmount();

    render(<RouteErrorState kind="not-invited" />);
    expect(screen.getByRole("link", { name: "Report this problem by email" })).toBeDefined();
  });

  it("does not offer the report link on the signed-out state", () => {
    render(<RouteErrorState kind="unauthorised" />);
    expect(screen.queryByRole("link", { name: "Report this problem by email" })).toBeNull();
  });

  it("shows the report link for the unknown kind but not for not-found", () => {
    const { unmount } = render(<RouteErrorState kind="unknown" />);
    expect(screen.getByRole("link", { name: "Report this problem by email" })).toBeDefined();
    unmount();

    render(<RouteErrorState kind="not-found" />);
    expect(screen.queryByRole("link", { name: "Report this problem by email" })).toBeNull();
  });

  it("gives a connection failure its own copy and a retry", () => {
    render(<RouteErrorState kind="unavailable" onRetry={() => {}} />);
    expect(screen.getByRole("heading", { name: "We couldn't reach Flump" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Try again" })).toBeDefined();
  });

  it("not-found has no retry, links home and uses the signpost scene", () => {
    const { container } = render(
      <RouteErrorState
        kind="not-found"
        onRetry={() => {}}
        primaryHref="/"
        primaryLabel="Go to Flump"
      />,
    );
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    expect(screen.getByRole("link", { name: "Go to Flump" }).getAttribute("href")).toBe("/");
    expect(container.querySelector("svg")?.getAttribute("data-scene")).toBe("not-found");
  });

  it("hides the illustration from assistive technology", () => {
    const { container } = render(<RouteErrorState kind="server" />);
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("shows the status code subtly only when given", () => {
    const { unmount } = render(<RouteErrorState kind="server" status={503} />);
    expect(screen.getByText("Error 503")).toBeDefined();
    unmount();
    render(<RouteErrorState kind="server" />);
    expect(screen.queryByText(/^Error \d+/)).toBeNull();
  });

  it("moves focus to the heading on mount", () => {
    render(<RouteErrorState kind="server" />);
    expect(document.activeElement).toBe(
      screen.getByRole("heading", { name: "We couldn't load your data" }),
    );
  });

  it("renders an h1 when asked and an h2 by default", () => {
    const { unmount } = render(<RouteErrorState kind="server" headingLevel="h1" />);
    expect(screen.getByRole("heading", { level: 1 })).toBeDefined();
    unmount();
    render(<RouteErrorState kind="server" />);
    expect(screen.getByRole("heading", { level: 2 })).toBeDefined();
  });
});
