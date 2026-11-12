import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Motion } from "./Motion";

describe("Motion Foundation", () => {
  it("renders durations, easings and keyframe samples", () => {
    render(<Motion />);
    expect(screen.getByRole("heading", { name: "Motion" })).toBeDefined();
    expect(screen.getByText("120ms")).toBeDefined();
    for (const name of ["fadeIn", "slideUp", "scaleIn", "shimmer"]) {
      expect(screen.getByTestId(`sample-${name}`)).toBeDefined();
    }
  });

  it("reduce motion toggle removes the animation classes", () => {
    render(<Motion />);
    const sample = screen.getByTestId("sample-fadeIn");
    const animated = sample.className;
    fireEvent.click(screen.getByRole("checkbox", { name: "Reduce motion" }));
    const still = screen.getByTestId("sample-fadeIn").className;
    expect(still.length).toBeLessThan(animated.length);
    expect(screen.getByTestId("sample-fadeIn").className).toBe(still);
  });
});
