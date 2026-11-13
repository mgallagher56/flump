import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { ResponsiveProvider } from "~/context/ResponsiveContext";
import { AppBottomBar } from "./AppBottomBar";

// The global test setup stubs router pieces; this test needs the real location and NavLink.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const renderBar = (user: unknown, path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ResponsiveProvider initialIsMobile={true}>
        <AppBottomBar user={user} />
      </ResponsiveProvider>
    </MemoryRouter>,
  );

describe("<AppBottomBar />", () => {
  it("shows the bar to a signed-in user", () => {
    renderBar({ id: "1" }, "/app/budget");
    expect(screen.getByTestId("mobile-bottom-bar")).not.toBeNull();
  });

  it("shows the sandbox bar to a signed-out visitor on /sandbox", () => {
    renderBar(null, "/sandbox");
    expect(screen.getByTestId("mobile-bottom-bar")).not.toBeNull();
    expect(screen.getByTestId("mobile-bottom-bar-accounts-disabled")).not.toBeNull();
  });

  it("shows nothing to a signed-out visitor elsewhere", () => {
    renderBar(null, "/");
    expect(screen.queryByTestId("mobile-bottom-bar")).toBeNull();
  });
});
