import { afterEach, describe, expect, it, vi } from "vitest";
import { focusWithoutJump } from "./useDialogFocusReturn";

const makeButton = (box: { top: number; height: number }) => {
  const button = document.createElement("button");
  document.body.appendChild(button);
  button.getBoundingClientRect = () =>
    ({
      top: box.top,
      bottom: box.top + box.height,
      left: 16,
      right: 116,
      width: 100,
      height: box.height,
      x: 16,
      y: box.top,
      toJSON: () => ({}),
    }) as DOMRect;
  const scrollIntoView = vi.fn();
  button.scrollIntoView = scrollIntoView;
  return { button, scrollIntoView };
};

afterEach(() => {
  document.body.innerHTML = "";
});

describe("focusWithoutJump (phone audit P12)", () => {
  it("focuses with preventScroll and leaves the page still when the opener is in view", () => {
    // jsdom's window is 1024 x 768; a 40px button at top 200 sits wholly inside it.
    const { button, scrollIntoView } = makeButton({ top: 200, height: 40 });
    const focus = vi.spyOn(button, "focus");
    focusWithoutJump(button);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(document.activeElement).toBe(button);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("brings an opener that is now off screen back by the least scroll", () => {
    // Top 900 is below the 768px window, so the opener is out of view.
    const { button, scrollIntoView } = makeButton({ top: 900, height: 40 });
    focusWithoutJump(button);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest", inline: "nearest" });
  });

  it("brings back an opener scrolled away above the window", () => {
    // Bottom at -200: the reader scrolled 240px on past a header action.
    const { button, scrollIntoView } = makeButton({ top: -240, height: 40 });
    focusWithoutJump(button);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });
});
