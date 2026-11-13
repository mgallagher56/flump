import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it.each(["text", "line", "block", "circle"] as const)("renders %s as aria-hidden", (shape) => {
    const { container } = render(<Skeleton shape={shape} />);
    expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders the requested number of text lines", () => {
    const { container } = render(<Skeleton lines={3} />);
    expect(container.firstElementChild?.children).toHaveLength(3);
  });

  it("adds a visually hidden label only when asked", () => {
    const { rerender } = render(<Skeleton shape="block" />);
    expect(screen.queryByText("Loading")).toBeNull();
    rerender(<Skeleton shape="block" label="Loading" />);
    expect(screen.getByText("Loading")).toBeTruthy();
  });
});
