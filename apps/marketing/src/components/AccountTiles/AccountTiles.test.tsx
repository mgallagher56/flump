import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { GsapKit } from "../../motion/loadGsapKit";
import type { MomentTimeline } from "../../motion/moments/arrive";
import { type AccountTile, AccountTiles } from "./AccountTiles";
import { dealInMoment } from "./dealInMoment";

const TILES: AccountTile[] = [
  { id: "cash", name: "Cash and savings", amount: 21_000, owed: false },
  { id: "home", name: "Home (your estimate)", amount: 310_000, owed: false },
  { id: "card", name: "Credit card", amount: 1_800, owed: true },
];

describe("AccountTiles", () => {
  it("lists each account with its amount and whether it is had or owed, in words", () => {
    render(<AccountTiles netWorth={329_200} tiles={TILES} />);
    const items = screen.getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([
      "Cash and savings£21,000You have",
      "Home (your estimate)£310,000You have",
      "Credit card£1,800You owe",
    ]);
    expect(screen.getByRole("list", { name: "Example accounts" })).toBeTruthy();
  });

  it("puts prototype 11's bubble field, layout a, behind the cards, hidden from assistive technology", () => {
    const { container } = render(<AccountTiles netWorth={329_200} tiles={TILES} />);
    const field = container.querySelector<HTMLElement>(
      "[data-account-tiles] > [data-bubble-field]",
    );
    expect(field?.dataset.bubbleField).toBe("a");
    expect(field?.getAttribute("aria-hidden")).toBe("true");
    expect(field?.querySelectorAll("span")).toHaveLength(3);
  });

  it("shows the net worth to the nearest hundred beside an Example tag", () => {
    render(<AccountTiles netWorth={329_249} tiles={TILES} />);
    expect(screen.getByText("Example")).toBeTruthy();
    // 329,249 to the nearest hundred: £329,200, once read out and once shown
    expect(screen.getByTestId("account-tiles-net-worth").textContent).toBe("£329,200£329,200");
  });
});

describe("dealInMoment", () => {
  it("deals each card from the deck's centre one step apart, with the prototype's turn and scale", () => {
    const { container } = render(<AccountTiles netWorth={329_200} tiles={TILES} />);
    const fromTo = vi.fn();
    const to = vi.fn();
    const moved = dealInMoment(
      {} as GsapKit,
      { fromTo, to } as unknown as MomentTimeline,
      container as HTMLElement,
    );
    const calls = fromTo.mock.calls as [
      unknown,
      Record<string, unknown>,
      Record<string, unknown>,
      number,
    ][];
    expect(calls).toHaveLength(3);
    // 0.3, then 0.26 apart
    calls.forEach((c, i) => {
      expect(c[3]).toBeCloseTo(0.3 + i * 0.26, 10);
    });
    // Three cards: the middle is 1, so the turns are (i - 1) * 1.2 degrees: -1.2, 0, 1.2.
    expect(calls.map(([, from]) => from.rotation)).toEqual([-1.2, 0, 1.2]);
    for (const [, from, end] of calls) {
      expect(from.scale).toBe(0.97);
      expect(end).toMatchObject({
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
        opacity: 1,
        ease: "calmInOut",
      });
    }
    expect(moved).toHaveLength(3);
  });

  it("counts the net worth through the running total as each card lands, ending on its value", () => {
    const { container } = render(<AccountTiles netWorth={329_200} tiles={TILES} />);
    const to = vi.fn();
    dealInMoment(
      {} as GsapKit,
      { fromTo: vi.fn(), to } as unknown as MomentTimeline,
      container as HTMLElement,
    );
    const counts = to.mock.calls as [unknown, Record<string, unknown>, number][];
    // Running totals by hand: 21,000; 21,000 + 310,000 = 331,000; then the last is the figure's
    // own value, 329,200 (331,000 - 1,800).
    expect(counts.map(([, vars]) => vars.v)).toEqual([21_000, 331_000, 329_200]);
    // Each count starts 0.25 after its card: 0.55, 0.81, 1.07.
    counts.forEach(([, , at], i) => {
      expect(at).toBeCloseTo(0.55 + i * 0.26, 10);
    });
  });
});
