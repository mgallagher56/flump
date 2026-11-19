import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import customRender from "~/testUtils/customRender";
import { SUPPORT_EMAIL } from "~/utils/support";
import AvatarMenu from "./AvatarMenu";

vi.mock("react-router", () => ({
  Link: ({ to, children, onClick, ...props }: any) => (
    <a href={to} onClick={onClick} {...props}>
      {children}
    </a>
  ),
  Form: ({ action, children }: any) => (
    <form action={action} method="post">
      {children}
    </form>
  ),
}));
vi.mock("../UserAvatar", () => ({ default: () => <span>avatar</span> }));
const hydration = vi.hoisted(() => ({ hydrated: true }));
vi.mock("~/hooks/useHydrated", () => ({ useHydrated: () => hydration.hydrated }));

const open = () => fireEvent.click(screen.getByTestId("avatar-menu-trigger"));

describe("<AvatarMenu />", () => {
  it("is a closed menu button until activated", () => {
    customRender(<AvatarMenu user={{ id: "1" }} />);
    const trigger = screen.getByTestId("avatar-menu-trigger");
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("lists Settings, Connect AI, Free calculators, Send feedback and Sign out", () => {
    customRender(<AvatarMenu user={{ id: "1" }} />);
    open();
    const links = screen.getAllByRole("menuitem").filter((el) => el.tagName === "A");
    expect(links.map((l) => l.getAttribute("href")?.split("?")[0])).toEqual([
      "/app/profile",
      "/app/profile",
      "/tools",
      `mailto:${SUPPORT_EMAIL}`,
    ]);
    expect(links[1]?.getAttribute("href")).toBe("/app/profile?tab=ai_connections");
    const logout = screen.getAllByRole("menuitem").find((el) => el.tagName === "BUTTON");
    expect(logout?.closest("form")?.getAttribute("action")).toBe("/logout");
    expect(screen.getByTestId("avatar-menu-trigger").getAttribute("aria-expanded")).toBe("true");
  });

  it("focuses the first item on open and moves with the arrow keys", () => {
    customRender(<AvatarMenu user={{ id: "1" }} />);
    open();
    const items = screen.getAllByRole("menuitem");
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowDown" });
    expect(document.activeElement).toBe(items[1]);
    fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowUp" });
    fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowUp" });
    expect(document.activeElement).toBe(items[items.length - 1]);
  });

  it("closes on Escape and returns focus to the trigger", () => {
    customRender(<AvatarMenu user={{ id: "1" }} />);
    open();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(screen.getByTestId("avatar-menu-trigger"));
  });

  it("returns focus to the trigger without scrolling the page (P12)", () => {
    customRender(<AvatarMenu user={{ id: "1" }} />);
    const trigger = screen.getByTestId("avatar-menu-trigger");
    const focus = vi.spyOn(trigger, "focus");
    open();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("gives each item a 44px touch height (P45)", () => {
    customRender(<AvatarMenu user={{ id: "1" }} />);
    open();
    for (const menuItem of screen.getAllByRole("menuitem")) {
      expect(menuItem.className).toContain("[@media_(pointer:_coarse)]:min-h_touch");
    }
  });

  it("closes on an outside click and after choosing a link", () => {
    customRender(<AvatarMenu user={{ id: "1" }} />);
    open();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("menu")).toBeNull();
    open();
    fireEvent.click(screen.getAllByRole("menuitem")[0]);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("toggles on repeated clicks and closes on Tab with focus back on the trigger", () => {
    customRender(<AvatarMenu user={{ id: "1" }} />);
    open();
    open();
    expect(screen.queryByRole("menu")).toBeNull();
    open();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Tab" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(screen.getByTestId("avatar-menu-trigger"));
  });

  it("is visibly inert before hydration, so an early click is not silently lost", () => {
    hydration.hydrated = false;
    customRender(<AvatarMenu user={{ id: "1" }} />);
    const trigger = screen.getByTestId("avatar-menu-trigger");
    expect(trigger.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(trigger);
    expect(screen.queryByRole("menu")).toBeNull();
    hydration.hydrated = true;
  });
});
