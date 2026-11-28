import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CloseStack, STACK_ORDER, STACK_SCATTER } from "./CloseStack";

describe("CloseStack", () => {
  it("piles prototype 10's six pieces back to front, the savings card in front", () => {
    render(<CloseStack />);
    const pieces = [...screen.getByTestId("close-stack").querySelectorAll("[data-close-piece]")];
    expect(pieces.map((piece) => piece.getAttribute("data-close-piece"))).toEqual([
      "statement",
      "payslip",
      "receipt",
      "pension",
      "credit",
      "card",
    ]);
    expect(STACK_ORDER).toHaveLength(6);
    // The front card's own words, not a picture of them.
    expect(within(pieces[5] as HTMLElement).getByText("Cash and savings")).toBeDefined();
    expect(within(pieces[0] as HTMLElement).getByText("Mortgage statement")).toBeDefined();
  });

  it("tags every piece 'Example' in real text, and hides the pile from assistive technology", () => {
    render(<CloseStack />);
    const stack = screen.getByTestId("close-stack");
    expect(stack.getAttribute("aria-hidden")).toBe("true");
    const pieces = stack.querySelectorAll("[data-close-piece]");
    for (const piece of pieces) {
      expect(within(piece as HTMLElement).getByText("Example", { exact: true }).tagName).toBe(
        "SPAN",
      );
    }
    expect(within(stack).getAllByText("Example", { exact: true })).toHaveLength(6);
  });

  it("server-renders the pile at rest: no inline style on any piece", () => {
    render(<CloseStack />);
    for (const piece of screen.getByTestId("close-stack").querySelectorAll("[data-close-piece]")) {
      expect(piece.getAttribute("style")).toBeNull();
    }
  });

  it("starts each piece's gather from prototype 10's place, never tilted past six degrees", () => {
    expect(STACK_SCATTER.map((s) => s.x)).toEqual([-70, 64, -52, 56, -28, 34]);
    expect(STACK_SCATTER.map((s) => s.y)).toEqual([-24, -20, 18, 22, -30, 26]);
    expect(STACK_SCATTER.map((s) => s.rotation)).toEqual([-6, 5, -4, 6, -5, 4]);
    expect(Math.max(...STACK_SCATTER.map((s) => Math.abs(s.rotation)))).toBe(6);
  });
});
