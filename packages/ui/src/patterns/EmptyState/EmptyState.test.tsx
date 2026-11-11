import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EmptyState } from "./EmptyState";

describe("EmptyState Pattern", () => {
  it("renders the title as an h2 by default", () => {
    render(<EmptyState title="No debts yet" />);
    expect(screen.getByRole("heading", { level: 2, name: "No debts yet" })).toBeDefined();
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
});
