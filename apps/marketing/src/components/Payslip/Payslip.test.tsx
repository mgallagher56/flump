import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { GsapKit } from "../../motion/loadGsapKit";
import type { MomentTimeline } from "../../motion/moments/arrive";
import { Payslip } from "./Payslip";
import { unfoldMoment } from "./unfoldMoment";

const slip = (
  <Payslip
    gross={4_333.333}
    net={3_248.62}
    rows={[
      { id: "tax", label: "Income Tax", amount: 613.83 },
      { id: "ni", label: "National Insurance", amount: 254.22 },
    ]}
    salary={52_000}
  />
);

describe("Payslip", () => {
  it("is an example payslip, open, its figures in en-GB pounds and pence", () => {
    render(slip);
    expect(screen.getByRole("article", { name: "Example payslip" })).toBeTruthy();
    expect(screen.getByText("Example")).toBeTruthy();
    expect(screen.getByText("£52,000 a year")).toBeTruthy();
    // 4,333.333 to the penny: £4,333.33
    expect(screen.getByText("£4,333.33")).toBeTruthy();
    expect(screen.getByText("£613.83")).toBeTruthy();
    expect(screen.getByText("£3,248.62")).toBeTruthy();
  });
});

describe("unfoldMoment", () => {
  it("turns the lower third down, then the top third up, then draws the rule", () => {
    const { container } = render(slip);
    const fromTo = vi.fn();
    const moved = unfoldMoment(
      {} as GsapKit,
      { fromTo } as unknown as MomentTimeline,
      container as HTMLElement,
    );
    const calls = fromTo.mock.calls as [Element, Record<string, number>, unknown, number][];
    const bottom = container.querySelector("[data-fold=bottom]");
    const top = container.querySelector("[data-fold=top]");
    expect(calls[0]?.[0]).toBe(bottom);
    expect(calls[0]?.[1]).toEqual({ rotationX: 178 });
    expect(calls[0]?.[3]).toBe(0.3);
    expect(calls[2]?.[0]).toBe(top);
    expect(calls[2]?.[1]).toEqual({ rotationX: -178 });
    // The top starts 0.7 after the bottom.
    expect(calls[2]?.[3]).toBeCloseTo(1.0, 10);
    expect(calls[4]?.[0]).toBe(container.querySelector("[data-payslip-rule]"));
    expect(moved).toHaveLength(3);
  });

  it("moves only the parts a payslip has", () => {
    const root = document.createElement("div");
    root.innerHTML = '<div data-fold="top"><span data-fold-shade></span></div>';
    const fromTo = vi.fn();
    const moved = unfoldMoment({} as GsapKit, { fromTo } as unknown as MomentTimeline, root);
    const top = root.querySelector("[data-fold=top]");
    // No lower third and no rule: the top's turn and its shade only, starting at 0.3 + 0.7.
    expect(fromTo).toHaveBeenCalledTimes(2);
    expect(fromTo.mock.calls[0]?.[0]).toBe(top);
    expect(fromTo.mock.calls[0]?.[3]).toBeCloseTo(1.0, 10);
    expect(moved).toEqual([top]);
  });

  it("moves nothing in an empty root", () => {
    const fromTo = vi.fn();
    const moved = unfoldMoment(
      {} as GsapKit,
      { fromTo } as unknown as MomentTimeline,
      document.createElement("div"),
    );
    expect(fromTo).not.toHaveBeenCalled();
    expect(moved).toEqual([]);
  });
});
