import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressRing } from "./ProgressRing";

describe("ProgressRing primitive", () => {
  it("exposes progressbar ARIA attributes and tabular count text", () => {
    const { container } = render(
      <ProgressRing id="setup-ring" label="Setup progress" max={5} value={2} />,
    );

    const ring = screen.getByRole("progressbar", { name: "Setup progress" });
    expect(ring.getAttribute("aria-valuenow")).toBe("2");
    expect(ring.getAttribute("aria-valuemin")).toBe("0");
    expect(ring.getAttribute("aria-valuemax")).toBe("5");
    expect(ring.getAttribute("aria-valuetext")).toBe("2 of 5");
    expect(ring.textContent).toBe("2/5");
    expect(container.querySelectorAll("[style]")).toHaveLength(0);
  });

  it("clamps out-of-range values and handles non-positive max safely", () => {
    render(<ProgressRing label="Clamped" max={0} value={-10} />);
    const ring = screen.getByRole("progressbar", { name: "Clamped" });
    expect(ring.getAttribute("aria-valuemax")).toBe("100");
    expect(ring.getAttribute("aria-valuenow")).toBe("0");
    expect(ring.textContent).toBe("0/100");
  });

  it("moves strokeDashoffset cleanly from full circumference at 0 to 0 at max", () => {
    const { container, rerender } = render(<ProgressRing label="Steps" max={4} value={0} />);
    const arcZero = container.querySelectorAll("circle")[1]!;
    const circumference = Number(arcZero.getAttribute("stroke-dasharray"));
    expect(Number(arcZero.getAttribute("stroke-dashoffset"))).toBeCloseTo(circumference, 3);

    rerender(<ProgressRing label="Steps" max={4} value={4} />);
    const arcFull = container.querySelectorAll("circle")[1]!;
    expect(Number(arcFull.getAttribute("stroke-dashoffset"))).toBeCloseTo(0, 3);
  });
});
