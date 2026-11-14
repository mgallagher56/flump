import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { ResponsiveProvider } from "~/context/ResponsiveContext";
import { AppBottomBar } from "./AppBottomBar";

// The global test setup stubs router pieces; this test needs the real location and Link.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const renderBar = (user: unknown, path: string, onMoreClick?: () => void) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ResponsiveProvider initialIsMobile={true}>
        <AppBottomBar user={user} onMoreClick={onMoreClick} />
      </ResponsiveProvider>
    </MemoryRouter>,
  );

const BAR = { name: "Main navigation" };

describe("<AppBottomBar />", () => {
  it("shows the bar to a signed-in user", () => {
    renderBar({ id: "1" }, "/app/budget");
    expect(screen.getByRole("navigation", BAR)).not.toBeNull();
  });

  it("lists Home, Accounts, Budget and Tax and pay, then More", () => {
    renderBar({ id: "1" }, "/app/budget");
    const hrefs = screen.getAllByRole("link").map((l) => l.getAttribute("href"));
    expect(hrefs).toEqual(["/", "/app/accounts", "/app/budget", "/app/take-home"]);
    expect(screen.getByTestId("nav-more")).not.toBeNull();
  });

  it("marks the current tab with aria-current", () => {
    renderBar({ id: "1" }, "/app/budget");
    const current = screen.getAllByRole("link").filter((l) => l.getAttribute("aria-current"));
    expect(current.map((l) => l.getAttribute("href"))).toEqual(["/app/budget"]);
  });

  it("treats Self Assessment as part of Tax and pay", () => {
    renderBar({ id: "1" }, "/app/self-assessment");
    expect(screen.getByRole("link", { current: "page" }).getAttribute("href")).toBe(
      "/app/take-home",
    );
  });

  it("calls onMoreClick from the More button", () => {
    const onMoreClick = vi.fn();
    renderBar({ id: "1" }, "/app/budget", onMoreClick);
    fireEvent.click(screen.getByTestId("nav-more"));
    expect(onMoreClick).toHaveBeenCalledTimes(1);
  });

  it("shows the sandbox bar to a signed-out visitor on /sandbox", () => {
    renderBar(null, "/sandbox");
    expect(screen.getByRole("navigation", BAR)).not.toBeNull();
    const disabled = screen.getByTestId("nav-accounts-disabled");
    expect(disabled.getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByRole("link", { name: /home/i }).getAttribute("href")).toBe("/sandbox");
  });

  it("shows nothing to a signed-out visitor elsewhere", () => {
    renderBar(null, "/");
    expect(screen.queryByRole("navigation", BAR)).toBeNull();
  });
});
