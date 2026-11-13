import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type ToastOptions, ToastProvider, useToast } from "./Toast";

const Trigger = ({
  options,
  label = "Show",
}: {
  options: ToastOptions | string;
  label?: string;
}) => {
  const { toast } = useToast();
  return (
    <button type="button" onClick={() => toast(options)}>
      {label}
    </button>
  );
};

const setup = (options: ToastOptions | string) =>
  render(
    <ToastProvider>
      <Trigger options={options} />
    </ToastProvider>,
  );

const show = () => fireEvent.click(screen.getByRole("button", { name: "Show" }));
const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

describe("Toast", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("throws a clear error outside the provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Trigger options="x" />)).toThrow(/ToastProvider/);
    spy.mockRestore();
  });

  it("shows a toast and announces it politely", () => {
    setup("Copied");
    show();
    expect(screen.getByRole("list", { name: "Notifications" }).textContent).toContain("Copied");
    advance(100);
    expect(screen.getByRole("status").textContent).toBe("Copied");
  });

  it("announces errors assertively", () => {
    setup({ title: "Could not save", tone: "danger" });
    show();
    advance(100);
    expect(screen.getByRole("alert").textContent).toBe("Could not save");
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("auto-dismisses non-error toasts after about 5 seconds", () => {
    setup("Copied");
    show();
    advance(4900);
    expect(screen.queryByRole("list")).not.toBeNull();
    advance(200);
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("never auto-dismisses error toasts", () => {
    setup({ title: "Could not save", tone: "danger", durationMs: 100 });
    show();
    advance(60_000);
    expect(screen.getByRole("list").textContent).toContain("Could not save");
  });

  it("keeps a toast with durationMs 0 until dismissed", () => {
    setup({ title: "Saved", durationMs: 0 });
    show();
    advance(60_000);
    expect(screen.queryByRole("list")).not.toBeNull();
  });

  it("pauses while hovered and resumes the remaining time", () => {
    setup("Copied");
    show();
    const item = screen.getByRole("listitem");
    advance(3000);
    fireEvent.mouseEnter(item);
    advance(60_000);
    expect(screen.queryByRole("list")).not.toBeNull();
    fireEvent.mouseLeave(item);
    advance(1900);
    expect(screen.queryByRole("list")).not.toBeNull();
    advance(200);
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("pauses while focus is inside the toast", () => {
    setup({ title: "Copied", action: <button type="button">Undo</button> });
    show();
    fireEvent.focus(screen.getByRole("button", { name: "Undo" }));
    advance(60_000);
    expect(screen.queryByRole("list")).not.toBeNull();
    fireEvent.blur(screen.getByRole("button", { name: "Undo" }), { relatedTarget: document.body });
    advance(5100);
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("dismisses with the button and with Escape", () => {
    setup({ title: "Could not save", tone: "danger" });
    show();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("list")).toBeNull();
    show();
    fireEvent.keyDown(screen.getByRole("button", { name: "Dismiss" }), { key: "Escape" });
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("announces the same text again on a second trigger", () => {
    setup("Copied");
    show();
    advance(100);
    show();
    advance(100);
    expect(screen.getByRole("status").textContent).toBe("Copied ");
  });

  it("caps visible toasts at maxVisible", () => {
    render(
      <ToastProvider maxVisible={2}>
        <Trigger options="One" />
      </ToastProvider>,
    );
    show();
    show();
    show();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});
