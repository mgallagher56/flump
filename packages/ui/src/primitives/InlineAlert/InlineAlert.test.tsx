import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Banner, InlineAlert, type InlineAlertTone } from "./InlineAlert";

describe("InlineAlert", () => {
  it("uses role=alert for errors", () => {
    render(<InlineAlert tone="danger" title="Payment failed" />);
    expect(screen.getByRole("alert")).toHaveProperty("textContent", "Error: Payment failed");
  });

  it.each<InlineAlertTone>(["info", "positive", "warning", "neutral"])(
    "uses role=status for %s",
    (tone) => {
      render(<InlineAlert tone={tone} title="Heads up" />);
      expect(screen.getByRole("status")).toBeTruthy();
      expect(screen.queryByRole("alert")).toBeNull();
    },
  );

  it("adds a tone word for screen readers and a decorative icon", () => {
    const { container } = render(<InlineAlert tone="warning" title="Rate rises in March" />);
    expect(screen.getByRole("status").textContent).toContain("Warning: ");
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders title, body and action", () => {
    render(
      <InlineAlert title="Rate rises" action={<button type="button">Review</button>}>
        Your fix ends in 3 months.
      </InlineAlert>,
    );
    expect(screen.getByText("Rate rises")).toBeTruthy();
    expect(screen.getByText("Your fix ends in 3 months.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Review" })).toBeTruthy();
  });

  it("shows a dismiss button only when onDismiss is given", () => {
    const onDismiss = vi.fn();
    const { rerender } = render(<InlineAlert title="Hello" />);
    expect(screen.queryByRole("button")).toBeNull();
    rerender(<InlineAlert title="Hello" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("Banner is the full-width variant with the same roles", () => {
    render(<Banner tone="danger" title="Offline" />);
    expect(screen.getByRole("alert")).toBeTruthy();
  });
});
