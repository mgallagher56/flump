import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FINANCIAL_BASELINE_STORAGE_KEY } from "~/state/baseline.store";
import { SignInAgainButton } from "./SignInAgainButton";

const fetcher = vi.hoisted(() => ({
  state: "idle" as "idle" | "submitting" | "loading",
  submit: (() => undefined) as (...args: unknown[]) => unknown,
}));
vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useFetcher: () => fetcher,
}));

describe("<SignInAgainButton />", () => {
  beforeEach(() => {
    fetcher.state = "idle";
    fetcher.submit = vi.fn();
    window.localStorage.clear();
  });

  it("signs out through /logout with the Data tab as the return path and clears storage", () => {
    window.localStorage.setItem(FINANCIAL_BASELINE_STORAGE_KEY, "{}");
    render(<SignInAgainButton />);
    fireEvent.click(screen.getByRole("button", { name: "Sign in again" }));
    expect(fetcher.submit).toHaveBeenCalledWith(
      { next: "/app/profile?tab=data" },
      { method: "post", action: "/logout" },
    );
    expect(window.localStorage.getItem(FINANCIAL_BASELINE_STORAGE_KEY)).toBeNull();
  });

  it("can return to the account deletion page instead", () => {
    render(<SignInAgainButton returnPath="/account-deleted?state=pending" />);
    fireEvent.click(screen.getByRole("button", { name: "Sign in again" }));
    expect(fetcher.submit).toHaveBeenCalledWith(
      { next: "/account-deleted?state=pending" },
      { method: "post", action: "/logout" },
    );
  });

  it("shows a pending state while signing out", () => {
    fetcher.state = "submitting";
    render(<SignInAgainButton />);
    expect(screen.getByRole("button", { name: "Sign in again" }).getAttribute("aria-busy")).toBe(
      "true",
    );
  });
});
