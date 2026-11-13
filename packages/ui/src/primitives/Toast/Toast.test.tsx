import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TOAST_ANNOUNCE_SLOT_MS,
  type ToastApi,
  type ToastOptions,
  ToastProvider,
  useOptionalToast,
  useToast,
} from "./Toast";

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

const Burst = () => {
  const { toast } = useToast();
  return (
    <button
      type="button"
      onClick={() => {
        toast("First");
        toast("Second");
      }}
    >
      Burst
    </button>
  );
};

const Many = () => {
  const { toast } = useToast();
  return (
    <button
      type="button"
      onClick={() => {
        toast({ title: "Err", tone: "danger" });
        toast("One");
        toast("Two");
      }}
    >
      Many
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
    expect(screen.getByRole("alert").textContent).toBe("Error: Could not save");
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
    fireEvent.pointerEnter(item, { pointerType: "mouse" });
    advance(60_000);
    expect(screen.queryByRole("list")).not.toBeNull();
    fireEvent.pointerLeave(item, { pointerType: "mouse" });
    advance(1900);
    expect(screen.queryByRole("list")).not.toBeNull();
    advance(200);
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("pauses while focus is inside the toast", () => {
    setup({
      title: "Copied",
      durationMs: 5000,
      action: <button type="button">Undo</button>,
    });
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

  it("announces identical polite text again with a no-break space", () => {
    setup("Copied");
    show();
    advance(100);
    expect(screen.getByRole("status").textContent).toBe("Copied");
    advance(TOAST_ANNOUNCE_SLOT_MS);
    show();
    advance(100);
    expect(screen.getByRole("status").textContent).toBe("Copied\u00A0");
    advance(TOAST_ANNOUNCE_SLOT_MS);
    show();
    advance(100);
    // Third in a row: must differ from the previous emitted text, so the space is dropped.
    expect(screen.getByRole("status").textContent).toBe("Copied");
  });

  it("re-announces identical danger text, per channel", () => {
    setup({ title: "Could not save", tone: "danger" });
    show();
    advance(100);
    expect(screen.getByRole("alert").textContent).toBe("Error: Could not save");
    advance(TOAST_ANNOUNCE_SLOT_MS);
    show();
    advance(100);
    expect(screen.getByRole("alert").textContent).toBe("Error: Could not save\u00A0");
  });

  it("does not add a space when the previous message on that channel differs", () => {
    render(
      <ToastProvider>
        <Trigger options="Copied" label="A" />
        <Trigger options={{ title: "Saved" }} label="B" />
        <Trigger options={{ title: "Copied", tone: "danger" }} label="C" />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "A" }));
    advance(TOAST_ANNOUNCE_SLOT_MS + 100);
    fireEvent.click(screen.getByRole("button", { name: "B" }));
    advance(100);
    expect(screen.getByRole("status").textContent).toBe("Saved");
    advance(TOAST_ANNOUNCE_SLOT_MS);
    fireEvent.click(screen.getByRole("button", { name: "A" }));
    advance(100);
    expect(screen.getByRole("status").textContent).toBe("Copied");
    // A polite "Copied" earlier does not affect the assertive channel.
    fireEvent.click(screen.getByRole("button", { name: "C" }));
    advance(100);
    expect(screen.getByRole("alert").textContent).toBe("Error: Copied");
  });

  it("announces two toasts raised in the same tick one after the other", () => {
    render(
      <ToastProvider>
        <Burst />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Burst" }));
    advance(100);
    expect(screen.getByRole("status").textContent).toBe("First");
    advance(TOAST_ANNOUNCE_SLOT_MS);
    advance(100);
    expect(screen.getByRole("status").textContent).toBe("Second");
  });

  it("prefixes non-neutral announcements with the tone word", () => {
    setup({ title: "Payment plan saved", tone: "positive" });
    show();
    advance(100);
    expect(screen.getByRole("status").textContent).toBe("Success: Payment plan saved");
  });

  it("persists toasts with an action or long text by default", () => {
    setup({ title: "Moved to archive", action: <button type="button">Undo</button> });
    show();
    advance(60_000);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    cleanup();
    setup("A".repeat(81));
    show();
    advance(60_000);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("pauses while the document is hidden", () => {
    setup("Copied");
    show();
    advance(2000);
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    advance(60_000);
    expect(screen.queryByRole("list")).not.toBeNull();
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    advance(3100);
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("a touch pointer does not pause the timer", () => {
    setup("Copied");
    show();
    fireEvent.pointerEnter(screen.getByRole("listitem"), { pointerType: "touch" });
    advance(5100);
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("evicts the oldest non-error toast first when over maxVisible", () => {
    render(
      <ToastProvider maxVisible={2}>
        <Many />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Many" }));
    const items = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(items).toHaveLength(2);
    expect(items[0]).toContain("Err");
    expect(items[1]).toContain("Two");
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

const OptionalProbe = ({ onApi }: { onApi: (api: ToastApi | null) => void }) => {
  onApi(useOptionalToast());
  return null;
};

describe("useOptionalToast", () => {
  afterEach(cleanup);

  it("returns null outside the provider instead of throwing", () => {
    let api: ToastApi | null | undefined;
    expect(() =>
      render(
        <OptionalProbe
          onApi={(value) => {
            api = value;
          }}
        />,
      ),
    ).not.toThrow();
    expect(api).toBeNull();
  });

  it("returns the toast API inside the provider", () => {
    let api: ToastApi | null = null;
    render(
      <ToastProvider>
        <OptionalProbe
          onApi={(value) => {
            api = value;
          }}
        />
      </ToastProvider>,
    );
    expect(api).not.toBeNull();
    act(() => {
      (api as ToastApi | null)?.toast("Saved");
    });
    expect(screen.getByRole("list", { name: "Notifications" }).textContent).toContain("Saved");
  });
});
