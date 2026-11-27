import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CarouselStepButton, getCarouselStep } from "./CarouselStepButton";
import { carouselStepButtonRecipe } from "./CarouselStepButton.styles";

describe("CarouselStepButton", () => {
  it("says the direction and the item it shows", () => {
    render(<CarouselStepButton direction="previous" targetLabel="Budget" />);
    const button = screen.getByRole("button");
    expect(button.textContent).toBe("Previous: Budget");
    expect(button.getAttribute("type")).toBe("button");
  });

  it("says only the direction without a target", () => {
    render(<CarouselStepButton direction="next" />);
    expect(screen.getByRole("button").textContent).toBe("Next");
  });

  it("calls onClick when enabled", () => {
    const onClick = vi.fn();
    render(<CarouselStepButton direction="next" onClick={onClick} targetLabel="Goals" />);
    const button = screen.getByRole("button", { name: "Next: Goals" });
    expect(button.hasAttribute("aria-disabled")).toBe(false);
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("stays focusable but does nothing at an end", () => {
    const onClick = vi.fn();
    render(<CarouselStepButton direction="next" disabled onClick={onClick} targetLabel="Goals" />);
    const button = screen.getByRole("button", { name: "Next" });
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.hasAttribute("disabled")).toBe(false);
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("has at least a 24px target that does not grow on touch", () => {
    const style = carouselStepButtonRecipe.raw() as Record<string, unknown>;
    expect(style.minWidth).toBe("24px");
    expect(style.minHeight).toBe("24px");
    expect(style["@media (pointer: coarse)"]).toBeUndefined();
  });

  it("uses the system disabled colour in forced colours when disabled", () => {
    const style = carouselStepButtonRecipe.raw() as Record<string, any>;
    expect(style["&[aria-disabled=true]"]._highContrast).toEqual({
      color: "GrayText",
      borderColor: "GrayText",
    });
  });

  it("pairs id and data-testid", () => {
    render(<CarouselStepButton direction="next" id="carousel-next" />);
    const button = screen.getByRole("button");
    expect(button.getAttribute("id")).toBe("carousel-next");
    expect(button.getAttribute("data-testid")).toBe("carousel-next");
  });
});

describe("getCarouselStep", () => {
  it.each([
    [2, 6, "next", false, 3],
    [2, 6, "previous", false, 1],
    [4, 6, "next", false, 5],
    [5, 6, "next", false, null],
    [5, 6, "next", true, 0],
    [1, 6, "previous", false, 0],
    [0, 6, "previous", false, null],
    [0, 6, "previous", true, 5],
    [0, 1, "next", true, null],
    [0, 0, "next", true, null],
  ] as const)("from %i of %i going %s (loop %s) lands on %s", (current, count, dir, loop, want) => {
    expect(getCarouselStep(current, count, dir, loop)).toBe(want);
  });
});
