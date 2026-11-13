import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Trash2 } from "lucide-react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { Menu, type MenuEntry } from "./Menu";

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const build = (onSelect = vi.fn()): MenuEntry[] => [
  { id: "edit", label: "Edit account", onSelect },
  { id: "export", label: "Export data", disabled: true },
  { type: "separator" },
  { id: "delete", label: "Delete account", tone: "danger", icon: Trash2 },
];

const trigger = <button type="button">More</button>;

describe("Menu", () => {
  it("opens from the trigger with menu and menuitem roles", async () => {
    render(<Menu aria-label="Account actions" items={build()} trigger={trigger} />);
    const button = screen.getByRole("button", { name: "More" });
    expect(button.getAttribute("aria-haspopup")).toBe("menu");
    fireEvent.keyDown(button, { key: "Enter" });
    expect(await screen.findByRole("menu", { name: "Account actions" })).toBeDefined();
    expect(screen.getAllByRole("menuitem")).toHaveLength(3);
    expect(screen.getByRole("separator")).toBeDefined();
  });

  it("keeps aria-controls valid when a custom id is given", async () => {
    render(<Menu id="acct-menu" items={build()} trigger={trigger} />);
    const button = screen.getByRole("button", { name: "More" });
    fireEvent.keyDown(button, { key: "Enter" });
    const menu = await screen.findByRole("menu");
    expect(button.getAttribute("aria-controls")).toBe(menu.id);
    expect(menu.getAttribute("data-testid")).toBe("acct-menu");
  });

  it("marks disabled items with aria-disabled and does not select them", async () => {
    const onSelect = vi.fn();
    const items = build();
    items[1] = { id: "export", label: "Export data", disabled: true, onSelect };
    render(<Menu items={items} defaultOpen trigger={trigger} />);
    const disabled = await screen.findByRole("menuitem", { name: "Export data" });
    expect(disabled.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(disabled);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("calls onSelect and closes when an item is chosen", async () => {
    const onSelect = vi.fn();
    render(<Menu items={build(onSelect)} defaultOpen trigger={trigger} />);
    fireEvent.click(await screen.findByRole("menuitem", { name: "Edit account" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });

  it("closes on Escape", async () => {
    render(<Menu items={build()} defaultOpen trigger={trigger} />);
    const menu = await screen.findByRole("menu");
    fireEvent.keyDown(menu, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });

  it("moves focus with the arrow keys", async () => {
    render(<Menu items={build()} defaultOpen trigger={trigger} />);
    const edit = await screen.findByRole("menuitem", { name: "Edit account" });
    edit.focus();
    fireEvent.keyDown(edit, { key: "ArrowDown" });
    await waitFor(() => expect(document.activeElement).not.toBe(edit));
  });
});
