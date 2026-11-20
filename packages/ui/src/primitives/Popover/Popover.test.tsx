import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { type ComponentProps, forwardRef } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { Popover, STICKY_HEADER_ATTRIBUTE, stickyHeaderInset } from "./Popover";

// Records the props Radix's Content receives, so a test can read the collision padding it was given.
const radixContentProps = vi.hoisted(() => [] as Array<Record<string, unknown>>);
vi.mock("@radix-ui/react-popover", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@radix-ui/react-popover")>();
  const Content = forwardRef<HTMLDivElement, ComponentProps<typeof actual.Content>>(
    (props, ref) => {
      radixContentProps.push(props as Record<string, unknown>);
      return <actual.Content ref={ref} {...props} />;
    },
  );
  return { ...actual, Content };
});

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe("Popover", () => {
  it("opens from the trigger and exposes a labelled dialog", async () => {
    render(
      <Popover title="Pay schedule" trigger={<button type="button">Details</button>}>
        Paid on the last working day.
      </Popover>,
    );
    const trigger = screen.getByRole("button", { name: "Details" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Pay schedule" });
    expect(dialog.textContent).toContain("Paid on the last working day.");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-controls")).toBe(dialog.id);
  });

  it("keeps aria-controls valid when a custom id is given", async () => {
    render(
      <Popover id="custom-body" title="Notes" trigger={<button type="button">Open</button>}>
        Body
      </Popover>,
    );
    const trigger = screen.getByRole("button", { name: "Open" });
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Notes" });
    expect(trigger.getAttribute("aria-controls")).toBe(dialog.id);
    expect(document.getElementById("custom-body")?.textContent).toBe("Body");
  });

  it("renders the title as the requested element", async () => {
    render(
      <Popover
        title="Notes"
        titleAs="div"
        defaultOpen
        trigger={<button type="button">Open</button>}
      >
        Body
      </Popover>,
    );
    await screen.findByRole("dialog", { name: "Notes" });
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("closes with the close button", async () => {
    const onOpenChange = vi.fn();
    render(
      <Popover
        title="Notes"
        defaultOpen
        onOpenChange={onOpenChange}
        closeLabel="Close notes"
        trigger={<button type="button">Open</button>}
      >
        Body
      </Popover>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Close notes" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes on Escape", async () => {
    render(
      <Popover title="Notes" defaultOpen trigger={<button type="button">Open</button>}>
        Body
      </Popover>,
    );
    const dialog = await screen.findByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("uses aria-label when there is no title and can hide the close button", async () => {
    render(
      <Popover
        aria-label="Quick help"
        showClose={false}
        defaultOpen
        trigger={<button type="button">Open</button>}
      >
        Body
      </Popover>,
    );
    expect(await screen.findByRole("dialog", { name: "Quick help" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
  });

  describe("sticky header inset (P32)", () => {
    const addHeader = (rect: Partial<DOMRect>) => {
      const header = document.createElement("header");
      header.setAttribute(STICKY_HEADER_ATTRIBUTE, "");
      header.getBoundingClientRect = () => ({ top: 0, bottom: 0, height: 0, ...rect }) as DOMRect;
      document.body.append(header);
      return header;
    };

    it("is 0 when the page has no sticky header", () => {
      expect(stickyHeaderInset()).toBe(0);
    });

    it("is the bottom edge of a sticky header pinned to the top", () => {
      // A 61px bar under a 47px notch inset reaches 108px down the viewport.
      const header = addHeader({ top: 0, bottom: 108, height: 108 });
      expect(stickyHeaderInset()).toBe(108);
      header.remove();
    });

    it("counts a visible sticky header that is not at the very top, by its bottom edge", () => {
      // Stuck 40px down (under a banner) and 60px tall: it reaches 100px down the viewport.
      const header = addHeader({ top: 40, bottom: 100, height: 60 });
      expect(stickyHeaderInset()).toBe(100);
      header.remove();
    });

    it("ignores a header scrolled above the viewport or sitting below it", () => {
      const above = addHeader({ top: -80, bottom: -20, height: 60 });
      const below = addHeader({
        top: window.innerHeight,
        bottom: window.innerHeight + 60,
        height: 60,
      });
      expect(stickyHeaderInset()).toBe(0);
      above.remove();
      below.remove();
    });

    it("passes the measured inset to Radix as the top collision padding", async () => {
      // A 60px header stuck 40px down reaches 100px; the panel keeps 16px clear of it: 116px.
      const header = addHeader({ top: 40, bottom: 100, height: 60 });
      radixContentProps.length = 0;
      render(
        <Popover title="Breathing room" trigger={<button type="button">About</button>} side="top">
          Money set aside.
        </Popover>,
      );
      fireEvent.click(screen.getByRole("button", { name: "About" }));
      await screen.findByRole("dialog", { name: "Breathing room" });
      expect(radixContentProps.at(-1)?.collisionPadding).toEqual({
        top: 116,
        right: 16,
        bottom: 16,
        left: 16,
      });
      header.remove();
    });

    it("ignores a hidden header", () => {
      const header = addHeader({ top: 0, bottom: 0, height: 0 });
      expect(stickyHeaderInset()).toBe(0);
      header.remove();
    });

    it("ignores a header with no height even when its edge sits down the page", () => {
      const header = addHeader({ top: 50, bottom: 50, height: 0 });
      expect(stickyHeaderInset()).toBe(0);
      header.remove();
    });

    it("still opens the panel when a sticky header is on the page", async () => {
      const header = addHeader({ top: 0, bottom: 61, height: 61 });
      render(
        <Popover title="Breathing room" trigger={<button type="button">About</button>} side="top">
          Money set aside.
        </Popover>,
      );
      fireEvent.click(screen.getByRole("button", { name: "About" }));
      expect(await screen.findByRole("dialog", { name: "Breathing room" })).toBeTruthy();
      header.remove();
    });
  });
});
