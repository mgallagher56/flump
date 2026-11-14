import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EmptyState } from "./EmptyState";

describe("EmptyState Pattern", () => {
  it("renders the title as an h2 by default", () => {
    render(<EmptyState title="No debts yet" />);
    expect(screen.getByRole("heading", { level: 2, name: "No debts yet" })).toBeDefined();
  });

  it("renders an h1 when it stands in for the page heading", () => {
    render(<EmptyState headingLevel="h1" title="We couldn't sign you in" />);
    expect(
      screen.getByRole("heading", { level: 1, name: "We couldn't sign you in" }),
    ).toBeDefined();
  });

  it("renders the title at the requested heading level", () => {
    render(<EmptyState headingLevel="h3" title="No debts yet" />);
    expect(screen.getByRole("heading", { level: 3, name: "No debts yet" })).toBeDefined();
    expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
  });

  it("renders the description, icon and action", () => {
    const onAdd = vi.fn();
    render(
      <EmptyState
        action={
          <button onClick={onAdd} type="button">
            Add debt
          </button>
        }
        description="Add your credit cards and loans."
        icon={<span>icon-glyph</span>}
        title="No debts yet"
      />,
    );
    expect(screen.getByText("Add your credit cards and loans.")).toBeDefined();
    expect(screen.getByText("icon-glyph")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Add debt" }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("omits the description, icon and action elements when absent", () => {
    const { container } = render(<EmptyState title="No debts yet" />);
    expect(container.querySelector("p")).toBeNull();
    expect(container.querySelector("#empty-state-description")).toBeNull();
    expect(container.querySelector("#empty-state-icon")).toBeNull();
    expect(container.querySelector("#empty-state-action")).toBeNull();
  });

  it("pairs id and data-testid and honours a custom id", () => {
    const { container } = render(<EmptyState id="debt-empty" title="No debts yet" />);
    const root = container.querySelector("#debt-empty");
    expect(root).not.toBeNull();
    expect(root?.getAttribute("data-testid")).toBe("debt-empty");
    expect(container.querySelector("#debt-empty-title")?.getAttribute("data-testid")).toBe(
      "debt-empty-title",
    );
  });

  it("renders a decorative illustration hidden from assistive technology", () => {
    const { container } = render(
      <EmptyState illustration={<svg data-testid="art" />} title="No debts yet" />,
    );
    const wrapper = container.querySelector("#empty-state-illustration");
    expect(wrapper?.getAttribute("aria-hidden")).toBe("true");
    expect(wrapper?.getAttribute("data-testid")).toBe("empty-state-illustration");
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("omits the illustration wrapper when absent", () => {
    const { container } = render(<EmptyState title="No debts yet" />);
    expect(container.querySelector("#empty-state-illustration")).toBeNull();
  });

  it("renders a secondary action beside the primary action", () => {
    const onLater = vi.fn();
    const { container } = render(
      <EmptyState
        action={<button type="button">Add debt</button>}
        secondaryAction={
          <button onClick={onLater} type="button">
            Import from a file
          </button>
        }
        title="No debts yet"
      />,
    );
    const buttons = container.querySelectorAll("button");
    expect(Array.from(buttons).map((b) => b.textContent)).toEqual([
      "Add debt",
      "Import from a file",
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Import from a file" }));
    expect(onLater).toHaveBeenCalledTimes(1);
    expect(container.querySelector("#empty-state-secondary-action")).not.toBeNull();
  });

  it("renders the action container for a secondary action alone", () => {
    const { container } = render(
      <EmptyState secondaryAction={<button type="button">Learn more</button>} title="No data" />,
    );
    expect(container.querySelector("#empty-state-action")).not.toBeNull();
  });

  it("supports tone and size variants without changing structure", () => {
    const { container } = render(<EmptyState size="sm" title="No data" tone="muted" />);
    expect(container.querySelector("section")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "No data" })).toBeDefined();
  });
});

describe("EmptyState card tone (R2-8)", () => {
  it("sits on the card surface with a hairline border, and default stays sunken", () => {
    const { container, rerender } = render(<EmptyState title="Turn it on" tone="card" />);
    const root = container.querySelector("section") as HTMLElement;
    expect(root.className).toContain("bg-c_surface.card");
    expect(root.className).toContain("bd-c_border.subtle");
    rerender(<EmptyState title="Turn it on" />);
    expect((container.querySelector("section") as HTMLElement).className).toContain(
      "bg-c_surface.sunken",
    );
  });
});

describe("EmptyState title spacing (R2-2)", () => {
  it.each(["md", "sm"] as const)("resets letter-spacing to normal at size %s", (size) => {
    render(<EmptyState size={size} title="Add your first account" />);
    const title = screen.getByRole("heading", { name: "Add your first account" });
    expect(title.className).toContain("ls_normal");
    expect(title.className).toContain(`textStyle_heading.${size}`);
  });
});
