import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button, ButtonLink, IconButton } from "./Button";

describe("Button Primitive", () => {
  it("renders with default primary variant and handles click", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Optimise ISA</Button>);
    const btn = screen.getByRole("button", { name: "Optimise ISA" });
    expect(btn).toBeDefined();
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("primary variant fills with primary.solid", () => {
    render(<Button>Save</Button>);
    const cls = screen.getByRole("button", { name: "Save" }).className;
    expect(cls).toContain("bg_primary.solid");
    expect(cls).not.toMatch(/(^|\s)bg_primary(\s|$)/);
  });

  it("applies disabled attributes correctly", () => {
    render(<Button disabled>Disabled Action</Button>);
    const btn = screen.getByRole("button", { name: "Disabled Action" });
    expect(btn).toHaveProperty("disabled", true);
  });

  it("danger and the deprecated destructive alias share the danger fill", () => {
    render(
      <>
        <Button variant="danger">Delete</Button>
        <Button variant="destructive">Remove</Button>
      </>,
    );
    for (const name of ["Delete", "Remove"]) {
      expect(screen.getByRole("button", { name }).className).toContain("bg_status.danger.solid");
    }
  });

  it("asChild styles the child element instead of rendering a button", () => {
    render(
      <Button asChild>
        <a href="/goals">Add a goal</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Add a goal" });
    expect(link.className).toContain("bg_primary.solid");
  });

  it("link variant keeps no control height or padding at every size", () => {
    for (const size of ["sm", "md", "lg"] as const) {
      const { unmount } = render(
        <Button size={size} variant="link">
          Learn more
        </Button>,
      );
      const cls = screen.getByRole("button", { name: "Learn more" }).className;
      expect(cls).toContain("min-h_0");
      expect(cls).toContain("px_1");
      unmount();
    }
  });

  it("renders no wrapper span unless pending", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button").querySelector("span")).toBeNull();
  });

  it("a pending asChild link ignores clicks and exposes busy state", () => {
    const onClick = vi.fn();
    render(
      <Button asChild onClick={onClick} pending>
        <a href="/goals">Add a goal</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Add a goal" });
    expect(link.getAttribute("aria-busy")).toBe("true");
    expect(link.querySelector("[aria-hidden='true']")).toBeNull();
    // Enter on a focused anchor is dispatched by the browser as a click, so a guarded click
    // handler covers both.
    const notPrevented = fireEvent.click(link);
    expect(notPrevented).toBe(false);
    expect(onClick).not.toHaveBeenCalled();
  });

  describe("pending", () => {
    it("sets aria-busy and aria-disabled, keeps the label and stays focusable", () => {
      render(<Button pending>Save changes</Button>);
      const btn = screen.getByRole("button", { name: "Save changes" });
      expect(btn.getAttribute("aria-busy")).toBe("true");
      expect(btn.getAttribute("aria-disabled")).toBe("true");
      expect(btn).toHaveProperty("disabled", false);
      expect(btn.querySelector("[aria-hidden='true']")).not.toBeNull();
    });

    it("ignores clicks while pending and resumes after", () => {
      const onClick = vi.fn();
      const { rerender } = render(
        <Button onClick={onClick} pending>
          Save changes
        </Button>,
      );
      fireEvent.click(screen.getByRole("button"));
      expect(onClick).not.toHaveBeenCalled();
      rerender(<Button onClick={onClick}>Save changes</Button>);
      const btn = screen.getByRole("button");
      expect(btn.getAttribute("aria-busy")).toBeNull();
      expect(btn.querySelector("[aria-hidden='true']")).toBeNull();
      fireEvent.click(btn);
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });
});

describe("IconButton", () => {
  it("uses label as the accessible name and forwards clicks", () => {
    const onClick = vi.fn();
    render(
      <IconButton label="Close dialog" onClick={onClick}>
        <svg aria-hidden="true" />
      </IconButton>,
    );
    const btn = screen.getByRole("button", { name: "Close dialog" });
    expect(btn.getAttribute("aria-label")).toBe("Close dialog");
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("defaults to ghost and md, and supports pending", () => {
    render(
      <IconButton label="Refresh" pending>
        <svg aria-hidden="true" />
      </IconButton>,
    );
    const btn = screen.getByRole("button", { name: "Refresh" });
    expect(btn.className).toContain("w_density.control.lg");
    expect(btn.getAttribute("aria-busy")).toBe("true");
  });

  it("requires a label at the type level", () => {
    // @ts-expect-error label is required
    const element = <IconButton>x</IconButton>;
    expect(element).toBeDefined();
  });
});

describe("ButtonLink", () => {
  it("renders an anchor with href and button styles", () => {
    render(<ButtonLink href="/goals">Add a goal</ButtonLink>);
    const link = screen.getByRole("link", { name: "Add a goal" });
    expect(link.getAttribute("href")).toBe("/goals");
    expect(link.className).toContain("bg_primary.solid");
  });

  it("styles a custom link component through asChild", () => {
    render(
      <ButtonLink asChild variant="secondary">
        <a href="/debt">Go to debt</a>
      </ButtonLink>,
    );
    const link = screen.getByRole("link", { name: "Go to debt" });
    expect(link.className).toContain("bg_surface.subtle");
  });
});
